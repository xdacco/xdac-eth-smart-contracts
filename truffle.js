// Allows us to use ES6 in our migrations and tests.
require('babel-register')({
  ignore: /node_modules\/(?!zeppelin-solidity)/
})
require('babel-polyfill')
var HDWalletProvider = require("truffle-hdwallet-provider");

var mnemonic = "spy fan faculty voice garlic squirrel outdoor clever orange message bunker addict";
module.exports = {
  networks: {
    development: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*' // Match any network id
    },
    ropsten: {
      provider: new HDWalletProvider(mnemonic, "https://ropsten.infura.io/j7U8DscZUPcTQXSBoDWw"),
      network_id: 3,
      gas: 4612388
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
}
