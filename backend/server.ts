const express = require('express');
const cors = require('cors');
const databaseRoutes = require('./routers/databaseRoutes');

const app = express();
const PORT = process.env.PORT || 3001;


app.use(cors());
app.use(express.json());


app.use('/api/database', databaseRoutes);


app.get('/api/health', (req: any, res: any) => {
  res.json({ message: 'Servidor funcionando correctamente' });
});


app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: { message: err.message }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

module.exports = app; 