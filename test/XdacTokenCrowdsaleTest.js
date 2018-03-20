import ether from '../node_modules/zeppelin-solidity/test/helpers/ether'
import { advanceBlock } from '../node_modules/zeppelin-solidity/test/helpers/advanceToBlock'
import EVMRevert from '../node_modules/zeppelin-solidity/test/helpers/EVMRevert'

const BigNumber = web3.BigNumber

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const XdacTokenCrowdsale = artifacts.require('XdacTokenCrowdsale')
const XdacToken = artifacts.require('XdacToken')

contract('XdacTokenCrowdsale', function ([owner, wallet, investor]) {

  const goals = [
    ether(0.05),
    ether(0.10),
    ether(0.15),
    ether(0.20),
    ether(0.25)
  ]

  const rates = [
    new BigNumber(12500),
    new BigNumber(12000),
    new BigNumber(11500),
    new BigNumber(11000),
    new BigNumber(10500)
  ]

  const minContribution = 0.001

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock()
  })

  beforeEach(async function () {
    this.crowdsale = await XdacTokenCrowdsale.new(
      wallet, goals, rates, ether(minContribution)
    )
  })

  it('should create crowdsale with correct parameters', async function () {
    this.crowdsale.should.exist
    const walletAddress = await this.crowdsale.wallet()
    walletAddress.should.be.equal(wallet)
  })

  it('should allow admin refunds', async function () {
    const balanceBeforeInvestment = web3.eth.getBalance(investor);
    await this.crowdsale.buyTokens(investor, { value: ether(0.01), from: investor, gasPrice: 0 });
    let contributor = await this.crowdsale.contributors.call(investor)
    contributor[0].should.be.bignumber.equal(ether(0.01))
    await this.crowdsale.refundTokensForAddress(investor, {from:owner}).should.be.fulfilled;
    const balanceAfterRefund = web3.eth.getBalance(investor);
    balanceBeforeInvestment.should.be.bignumber.equal(balanceAfterRefund);
  });

  it('should allow refunds', async function () {
    const balanceBeforeInvestment = web3.eth.getBalance(investor);
    await this.crowdsale.buyTokens(investor, { value: ether(0.01), from: investor, gasPrice: 0 });
    let contributor = await this.crowdsale.contributors.call(investor)
    contributor[0].should.be.bignumber.equal(ether(0.01))
    await this.crowdsale.refundTokens({ from: investor, gasPrice: 0 }).should.be.fulfilled;

    const balanceAfterRefund = web3.eth.getBalance(investor);
    balanceBeforeInvestment.should.be.bignumber.equal(balanceAfterRefund);
  });

  it('should allow admin to change token owner', async function () {
    let tokenAddr = await this.crowdsale.token()
    const ownerOld = await XdacToken.at(tokenAddr).owner()
    const ownerOldBalance = await XdacToken.at(tokenAddr).balanceOf(ownerOld)
    await this.crowdsale.transferTokenOwnership(investor).should.be.fulfilled;
    const ownerNew = await XdacToken.at(tokenAddr).owner()
    const ownerNewBalance = await XdacToken.at(tokenAddr).balanceOf(investor)
    assert.isTrue(ownerNew === investor && ownerNew != ownerOld);
    ownerOldBalance.should.be.bignumber.equal(ownerNewBalance);
  });

  it('should allow whitelist investor', async function () {
    await this.crowdsale.whitelistAddress(investor).should.be.fulfilled
    let contributor = await this.crowdsale.contributors.call(investor).should.be.fulfilled
    contributor[1].should.be.true
  })

  it('should not accept less then ' + minContribution + ' ether', async function () {
    await this.crowdsale.whitelistAddress(investor).should.be.fulfilled
    await this.crowdsale.buyTokens(investor, {
      from: investor,
      value: ether(minContribution - minContribution / 2)
    }).should.be.rejectedWith(EVMRevert)
  })

  it('should reject payments over cap', async function () {
    await this.crowdsale.whitelistAddress(investor).should.be.fulfilled
    await this.crowdsale.buyTokens(investor, { from: investor, value: goals[4] }).should.be.fulfilled
    await this.crowdsale.send(1).should.be.rejectedWith(EVMRevert)
  })

  it('should accept payments during the sale for whitelisted address', async function () {
    await this.crowdsale.whitelistAddress(investor).should.be.fulfilled
    let contributor = await this.crowdsale.contributors.call(investor).should.be.fulfilled
    contributor[1].should.be.true

    let token = await this.crowdsale.token().should.be.fulfilled

    //ROUND 0
    const expectedTokenAmount1 = rates[0].mul(ether(0.01))
    await this.crowdsale.buyTokens(investor, { value: ether(0.01), from: investor }).should.be.fulfilled
    const balance = await XdacToken.at(token).balanceOf(investor)
    balance.should.be.bignumber.equal(expectedTokenAmount1)

    //ROUND 1
    const expectedTokenAmount2 = rates[0].mul(ether(0.04)).add(rates[1].mul(ether(0.01))).add(expectedTokenAmount1)
    await this.crowdsale.buyTokens(investor, { value: ether(0.05), from: investor }).should.be.fulfilled
    const balance2 = await XdacToken.at(token).balanceOf(investor)
    balance2.should.be.bignumber.equal(expectedTokenAmount2)

    //ROUND 2
    const expectedTokenAmount3 = rates[1].mul(ether(0.04)).add(rates[2].mul(ether(0.01))).add(expectedTokenAmount2)
    await this.crowdsale.buyTokens(investor, { value: ether(0.05), from: investor }).should.be.fulfilled
    const balance3 = await XdacToken.at(token).balanceOf(investor)
    balance3.should.be.bignumber.equal(expectedTokenAmount3)

    //ROUND 3
    const expectedTokenAmount4 = rates[2].mul(ether(0.04)).add(rates[3].mul(ether(0.01))).add(expectedTokenAmount3)
    await this.crowdsale.buyTokens(investor, { value: ether(0.05), from: investor }).should.be.fulfilled
    const balance4 = await XdacToken.at(token).balanceOf(investor)
    balance4.should.be.bignumber.equal(expectedTokenAmount4)

    //ROUND 4
    const expectedTokenAmount5 = rates[3].mul(ether(0.04)).add(rates[4].mul(ether(0.01))).add(expectedTokenAmount4)
    await this.crowdsale.buyTokens(investor, { value: ether(0.05), from: investor }).should.be.fulfilled
    const balance5 = await XdacToken.at(token).balanceOf(investor)
    balance5.should.be.bignumber.equal(expectedTokenAmount5)

    //ROUND 4
    const expectedTokenAmount6 = rates[4].mul(ether(0.04)).add(expectedTokenAmount5)
    await this.crowdsale.buyTokens(investor, { value: ether(0.04), from: investor }).should.be.fulfilled
    const balance6 = await XdacToken.at(token).balanceOf(investor)
    balance6.should.be.bignumber.equal(expectedTokenAmount6)

  })

  it('should forward ether and tokens after whitelisting', async function () {

    const etherAmount = ether(0.01);
    const expectedTokenAmount = rates[0].mul(etherAmount)

    await this.crowdsale.buyTokens(investor, { value: etherAmount, from: investor }).should.be.fulfilled
    const beforeWhitelisting = await this.crowdsale.contributors.call(investor).should.be.fulfilled
    beforeWhitelisting[0].should.be.bignumber.equal(etherAmount)

    await this.crowdsale.whitelistAddress(investor).should.be.fulfilled

    const afterWhitelisting = await this.crowdsale.contributors.call(investor).should.be.fulfilled
    afterWhitelisting[1].should.be.true

    const token = await this.crowdsale.token().should.be.fulfilled
    const balance = await XdacToken.at(token).balanceOf(investor)
    balance.should.be.bignumber.equal(expectedTokenAmount)

  })



})
