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

      'mongodb+srv://' + process.env.USERDB + ':' + process.env.PWDDB + '@cluster0.90xaw.mongodb.net/bootcamp?retryWrites=true&w=majority',
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

app.listen(process.env.PORT, () => console.log('Servidor em execucao'));
