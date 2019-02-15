import {assert} from 'chai';
import Outpoint from './Outpoint';
import PlasmaContract from '../lib/PlasmaContract';
import PlasmaClient from '../lib/PlasmaClient';
import MerkleTree from '../lib/MerkleTree';
import {sha256} from '../lib/hash';
import BN = require('bn.js');
import {wait} from '../lib/wait';

export default class ExitOperation {
  private contract: PlasmaContract;

  private client: PlasmaClient;

  private from: string;

  private outpoint: Outpoint | null = null;

  private committedFee: BN | null = null;

  constructor (contract: PlasmaContract, client: PlasmaClient, from: string) {
    this.contract = contract;
    this.client = client;
    this.from = from;
  }

  withOutpoint (outpoint: Outpoint): ExitOperation {
    this.outpoint = outpoint;
    return this;
  }

  withCommittedFee (committedFee: BN): ExitOperation {
    this.committedFee = committedFee;
    return this;
  }

  async exit () {
    assert(this.outpoint, 'an outpoint to exit must be provided');
    assert(this.committedFee, 'a fee must be provided');
    const block = await this.client.getBlock(this.outpoint!.blockNum);
    const merkle = new MerkleTree();
    for (const tx of block.transactions) {
      merkle.addItem(sha256(tx.transaction.toRLP()));
    }
    const {proof} = merkle.generateProofAndRoot(this.outpoint!.txIdx);
    const confirmSigs: [Buffer, Buffer] = [
      this.outpoint!.confirmSig,
      Buffer.from('')
    ];
    await this.contract.startExit(this.outpoint!, proof, confirmSigs, this.committedFee!, this.from);
  }
}