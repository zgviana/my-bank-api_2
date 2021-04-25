import express from 'express';
import { accountsModel } from '../models/accounts.js';

const app = express();

app.get('/account', async (req, res) => {
  const account = await accountsModel.find({});

  try {
    res.send(account);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/consultarAccount', async (req, res) => {
  const dados = req.body;
  const account = await accountsModel.find({ conta: dados.conta, agencia: dados.agencia });

  if (!account[0]) {
    res.status(404).send('Conta não encontrada');
    return;
  }

  try {
    res.send(account);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/menoresSaldosAccount/:numDados', async (req, res) => {
  const num = req.params.numDados;
  try {
    const account = await accountsModel.aggregate([{ $sort: { balance: 1 } },
    { $limit: parseInt(num) }
    ]);

    if (!account[0]) {
      res.status(404).send('Conta não encontrada');
      return;
    }

    res.send(account);
  } catch (err) {
    res.status(500).send(err);
  }
});


app.get('/maioresSaldosAccount/:numDados', async (req, res) => {
  const num = req.params.numDados;
  try {
    const account = await accountsModel.aggregate([{ $sort: { balance: -1, name: 1 } },
    { $limit: parseInt(num) }
    ]);

    if (!account[0]) {
      res.status(404).send('Conta não encontrada');
      return;
    }

    res.send(account);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/transferirAgencia99', async (req, res) => {

  try {
    const dados = req.body;
    const todasContasAgencias = await accountsModel.find({});
    const todasAgenciasContasMax = await accountsModel.aggregate([{ $group: { _id: "$agencia", max: { $max: "$balance" } } }]);
    let conjuntoAgenciaConta = null;
    let accountMap = null;
    let conjuntoAgencia99 = [];

    todasAgenciasContasMax.forEach(async (acc) => {
      if (acc._id !== 99) {
        //console.log(acc._id);
        conjuntoAgenciaConta = todasContasAgencias.filter((acc2) => {
          return acc2.agencia === acc._id
        });

        accountMap = conjuntoAgenciaConta.map((account) => {
          const { _id, name, balance, conta, agencia } = account;
          return ({
            _id,
            name,
            balance,
            conta,
            agencia: 99
          });
        }).sort((a, b) => b.balance - a.balance);

        conjuntoAgencia99.push(accountMap[0]);
        //console.log(accountMap[0]);
        const updateConta = await accountsModel.findOneAndUpdate(
          { _id: accountMap[0]._id },
          accountMap[0],
          { new: true, useFindAndModify: false },
        );
      }
    });

    // const accountFilter = account.filter((acc) => {
    //   return acc._id === dados.agencia
    // });

    //console.log(conjuntoAgencia99);

    if (!accountMap[0]) {
      res.status(404).send('Conta não encontrada');
      return;
    }

    res.send(conjuntoAgencia99);
  } catch (err) {
    res.status(500).send(err);
    return;
  }
});

app.get('/consultarMediaAgencia', async (req, res) => {
  const dados = req.body;
  try {
    const account = await accountsModel.aggregate([{ $group: { _id: "$agencia", media: { $avg: "$balance" } } }]);

    const accountFilter = account.filter((acc) => {
      return acc._id === dados.agencia
    });

    console.log(accountFilter);

    if (!accountFilter[0]) {
      res.status(404).send('Conta não encontrada');
      return;
    }

    res.send(accountFilter);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post('/account', async (req, res) => {
  const account = new accountsModel(req.body);

  try {
    await account.save();
    res.send(account);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.delete('/deleteAccount', async (req, res) => {
  try {
    const dados = req.body;
    const accountUsuario = await accountsModel.find({ conta: dados.conta, agencia: dados.agencia });


    if (!accountUsuario[0]) {
      res.status(404).send('Documento nao encontrado');
      return;
    }
    const account = await accountsModel.findOneAndDelete({ _id: accountUsuario[0]._id });

    const accountAgencia = await accountsModel.find({ agencia: dados.agencia });

    res.status(200).send('Total Contas ativas: ' + accountAgencia.length);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.delete('/deleteBase', async (req, res) => {
  try {
    const dados = req.body;
    const accountUsuario = await accountsModel.find({});

    const accountDeletedas = accountUsuario.length;

    const account = await accountsModel.deleteMany();

    res.status(200).send('Total Contas deletadas: ' + accountDeletedas);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.delete('/account/:id', async (req, res) => {
  try {

    const account = await accountsModel.findOneAndDelete({ _id: req.params.id });

    if (!account[0]) {
      res.status(404).send('Documento nao encontrado');
      return;
    }

    res.status(200).send('OK');
  } catch (err) {
    res.status(500).send(err);
  }
});

app.patch('/transferenciaAccount/', async (req, res) => {
  try {
    const dados = req.body;
    let tarifa = 0;

    const accountUsuarioOrigem = await accountsModel.find({ conta: dados.contaOrigem });
    const accountUsuarioDestino = await accountsModel.find({ conta: dados.contaDestino });
    //console.log(accountUsuario);
    if (!accountUsuarioOrigem[0]) {
      res.status(404).send('Conta de origem não encontrada');
      return;
    }

    if (!accountUsuarioDestino[0]) {
      res.status(404).send('Conta de destino não encontrada');
      return;
    }

    if (accountUsuarioOrigem[0].agencia !== accountUsuarioDestino[0].agencia) {
      tarifa = 8;
    }

    if ((accountUsuarioOrigem[0].balance - tarifa) < dados.valorTranferencia) {
      res.status(404).send('Saldo insuficiente');
      return;
    }

    const accountMapOrigem = accountUsuarioOrigem.map((account) => {
      const { _id, name, balance, conta, agencia } = account;
      return ({
        //_id,
        name,
        balance: (balance - dados.valorTranferencia) - tarifa,
        conta,
        agencia
      });
    });

    const accountMapDestino = accountUsuarioDestino.map((account) => {
      const { _id, name, balance, conta, agencia } = account;
      return ({
        //_id,
        name,
        balance: (balance + dados.valorTranferencia),
        conta,
        agencia
      });
    });

    //console.log(accountMap);
    //accountMap[0].balance = accountMap[0].balance + dados.balance;
    const accountOrigem = await accountsModel.findOneAndUpdate(
      { _id: accountUsuarioOrigem[0]._id },
      accountMapOrigem[0],
      { new: true, useFindAndModify: false },
    );

    const accountDestino = await accountsModel.findOneAndUpdate(
      { _id: accountUsuarioDestino[0]._id },
      accountMapDestino[0],
      { new: true, useFindAndModify: false },
    );

    res.send(accountOrigem);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.patch('/depositoAccount/', async (req, res) => {
  try {
    const dados = req.body;

    const accountUsuario = await accountsModel.find({ conta: dados.conta, agencia: dados.agencia });
    //console.log(accountUsuario);
    if (!accountUsuario[0]) {
      res.status(404).send('Conta não encontrada');
      return;
    }

    const accountMap = accountUsuario.map((account) => {
      const { _id, name, balance, conta, agencia } = account;
      return ({
        //_id,
        name,
        balance: balance + dados.balance,
        conta,
        agencia
      });
    });

    //console.log(accountMap);
    //accountMap[0].balance = accountMap[0].balance + dados.balance;
    const account = await accountsModel.findOneAndUpdate(
      { _id: accountUsuario[0]._id },
      accountMap[0],
      { new: true, useFindAndModify: false },
    );

    res.send(account);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.patch('/saqueAccount/', async (req, res) => {
  try {
    const dados = req.body;
    const tarifa = 1;

    const accountUsuario = await accountsModel.find({ conta: dados.conta, agencia: dados.agencia });
    //console.log(accountUsuario);
    if (!accountUsuario[0]) {
      res.status(404).send('Conta não encontrada');
      return;
    }

    if (accountUsuario[0].balance - 1 < dados.balance) {
      res.status(404).send('Saldo insuficiente');
      return;
    }

    const accountMap = accountUsuario.map((account) => {
      const { _id, name, balance, conta, agencia } = account;
      return ({
        //_id,
        name,
        balance: (balance - dados.balance) - tarifa,
        conta,
        agencia
      });
    });

    //console.log(accountMap);
    //accountMap[0].balance = accountMap[0].balance + dados.balance;
    const account = await accountsModel.findOneAndUpdate(
      { _id: accountUsuario[0]._id },
      accountMap[0],
      { new: true, useFindAndModify: false },
    );

    res.send(account);
  } catch (err) {
    res.status(500).send(err);
  }
});


export { app as accountRouter };
