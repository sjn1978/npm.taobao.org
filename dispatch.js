/**!
 * npm.taobao.org - dispatch.js
 *
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
 *  fengmk2 <m@fengmk2.com> (http://fengmk2.com)
 */

'use strict';

/**
 * Module dependencies.
 */

var childProcess = require('child_process');
var path = require('path');
var util = require('util');
var cfork = require('cfork');
var workerPath = path.join(__dirname, 'worker.js');
var syncPath = path.join(__dirname, 'sync.js');

forkWorker();
if (process.env.CNPM_SYNCER) {
  forkSyncer();
}

function forkWorker() {
  cfork({
    exec: workerPath,
    count: require('os').cpus().length,
  }).on('fork', function (worker) {
    console.log('[%s] [worker:%d] new worker start', Date(), worker.process.pid);
  }).on('disconnect', function (worker) {
    console.error('[%s] [master:%s] wroker:%s disconnect, suicide: %s, state: %s.',
      Date(), process.pid, worker.process.pid, worker.suicide, worker.state);
  }).on('exit', function (worker, code, signal) {
    var exitCode = worker.process.exitCode;
    var err = new Error(util.format('worker %s died (code: %s, signal: %s, suicide: %s, state: %s)',
      worker.process.pid, exitCode, signal, worker.suicide, worker.state));
    err.name = 'WorkerDiedError';
    console.error('[%s] [master:%s] wroker exit: %s', Date(), process.pid, err.stack);
  });
}

function forkSyncer() {
  var syncer = childProcess.fork(syncPath);
  syncer.on('exit', function (code, signal) {
    var err = new Error(util.format('syncer %s died (code: %s, signal: %s, stdout: %s, stderr: %s)',
      syncer.pid, code, signal, syncer.stdout, syncer.stderr));
    err.name = 'SyncerWorkerDiedError';
    console.error('[%s] [master:%s] syncer exit: %s: %s',
      Date(), process.pid, err.name, err.message);
    setTimeout(forkSyncer, 1000);
  });
}
