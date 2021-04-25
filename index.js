/*Imports */
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import { accountRouter } from './routes/accountsRoutes.js';

const app = express();

/*Conexao com o MongoDB*/
(async () => {
  try {
    await mongoose.connect(
      //'mongodb+srv://admin:sacola151@cluster0.90xaw.mongodb.net/bootcamp?retryWrites=true&w=majority',
      'mongodb+srv://' + process.env.USERDB + ':' + process.env.PWDDB + '@cluster0.90xaw.mongodb.net/bootcamp?retryWrites=true&w=majority',
      // 'mongodb+srv://' +
      // process.env.USERDB +
      // ':' +
      // process.env.PWDDB +
      // '@bootcamp-smurc.mongodb.net/grades?retryWrites=true&w=majority',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log('Conectado no MongoDB');
  } catch (error) {
    console.log('Erro ao conectar no MongoDB');
  }
})();

app.use(express.json());
app.use(accountRouter);

app.listen(3000, () => console.log('Servidor em execucao'));
