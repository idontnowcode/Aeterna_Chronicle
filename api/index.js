const { app, connectMongoDB } = require('../backend/src/app');

let connected = false;

module.exports = async (req, res) => {
  if (!connected) {
    await connectMongoDB();
    connected = true;
  }
  app(req, res);
};
