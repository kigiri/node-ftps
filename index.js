"use strict";
const spawn = require('child_process').spawn;
const _ = require('lodash');

/*
** Params :
** {
**   host: 'domain.com', // Required
**   username: 'Test', // Required
**   password: 'Test', // Required
**   protocol: 'sftp', // Optional, values : 'ftp', 'sftp', 'ftps', ... default: 'ftp'
**   // protocol is added on beginning of host, ex : sftp://domain.com in this case
**   port: '22', // Optional
**   // port is added at the end of the host, ex : sftp://domain.com:28 in this case
**   retries: 2, // Optional, defaults to 1 (1 = no retries, 0 = unlimited retries)
**   timeout: 10, // Optional, Time before failing a connection attempt. Defaults to 10
**   retryInterval: 5, // Optional, Time in seconds between attempts. Defaults to 5
**   retryMultiplier: 1, // Optional, Multiplier by which retryInterval is multiplied each time new attempt fails. Defaults to 1
**   requiresPassword: true, // Optional, defaults to true  
**   autoConfirm: true, // Optional, defaults to false
**  cwd: '' // Optional, defaults to the directory from where the script is executed
** }
**
** Usage :
** ftp.cd('some_directory').rm('./test.txt').exec(console.log)
*/

const defaults = {
  host: '',
  username: '',
  password: '',
  escape: true,
  retries: 1, // LFTP by default tries an unlimited amount of times so we change that here
  timeout: 10, // Time before failing a connection attempt
  retryInterval: 5, // Time in seconds between attempts
  retryIntervalMultiplier: 1, // Multiplier by which retryInterval is multiplied each time new attempt fails
  requiresPassword: true, // Supports Anonymous FTP
  autoConfirm: false, // Auto confirm ssl certificate,
  cwd: '' // Use a different working directory
}

const availableConfig = _.keys(defaults).concat([ 'port', 'protocol' ]);

const fail = msg => { throw new Error(msg) };
const pass = _ => _;

function getBaseCmd(opts, escapeshell) {
  const cmd = []
  
  // Only support SFTP or FISH for ssl autoConfirm
  if((opts.protocol.toLowerCase() === "sftp" || opts.protocol.toLowerCase() === "fish") && opts.autoConfirm)
    cmd.push('set '+ opts.protocol.toLowerCase() +':auto-confirm yes')

  cmd.push('set net:max-retries '+ opts.retries)
  cmd.push('set net:timeout '+ opts.timeout)
  cmd.push('set net:reconnect-interval-base '+ opts.retryInterval)
  cmd.push('set net:reconnect-interval-multiplier '+ opts.retryIntervalMultiplier)
  cmd.push('open -u "'+ escapeshell(opts.username) +'","'+ escapeshell(opts.password) +'" "'+ opts.host +'"')
  return cmd.join(';') + ';'
}

function FTP(options) {
  let cmds = [];

  // Extend options with defaults
  const opts = _.defaults(_.pick(options, availableConfig));
  
  // Validation
  if (!opts.host)
    fail('You need to set a host.')

  if (!opts.username)
    fail('You need to set an username.')

  if (opts.requiresPassword === true && !opts.password)
    fail('You need to set a password.')

  if (options.protocol && typeof options.protocol !== 'string')
    fail('Protocol needs to be of type string.')
  
  // Setting options
  if (options.protocol && opts.host.indexOf(options.protocol +'://') !== 0)
    opts.host = options.protocol +'://'+ options.host

  if (opts.port)
    opts.host = opts.host +':'+ opts.port

  const escapeshell = opts.escape ? FTP.escapeshell : pass;
  const baseCmd = getBaseCmd(opts, escapeshell);
  const spawnoptions = {};

  if (opts.cwd) {
    spawnoptions.cwd = opts.cwd;
  }

  const state = {
    exec,
    then,
    ls,
    pwd,
    cd,
    cat,
    put,
    get: get,
    mv,
    rm,
    rmdir,
    raw,
		catch: _catch,
    addFile: put,
    getFile: get,
    move: mv,
    remove: rm,
  }


  function then(success, failure) {
    return exec().then(success, failure);
  }

  function _catch(failure) {
    return exec().catch(failure);
  }

  function exec(extraCmds) {
    let cmd = baseCmd;

    if (typeof extraCmds === 'string')
      cmd += extraCmds;
    else if (Array.isArray(extraCmds))
      cmds = cmds.concat(extraCmds)

    cmd += cmds.join(';')
    cmds = []
    
    const lftp = spawn('lftp', ['-c', cmd], spawnoptions)
    return new Promise((resolve, reject) => {
      const stdout = []
      const stderr = []

      lftp.stdout.on('data', res => stdout.push(res))
      lftp.stderr.on('data', res => stderr.push(res))
      lftp.on('error', reject);
      lftp.on('exit', () => resolve({
        stderr,
        stdout,
        error: stderr.join(''),
        data: stdout.join('')
      }))
    })
  }

  function ls() { return raw('ls') }

  function pwd() { return raw('pwd') }

  function cd(directory) { return raw('cd '+ escapeshell(directory)) }

  function cat(path) { return raw('cat '+ escapeshell(path)) }

  function put(localPath, remotePath) {
    if (!localPath)
      return state
    if (!remotePath)
      return raw('put '+ escapeshell(localPath))
    return raw('put '+ escapeshell(localPath) +' -o '+ escapeshell(remotePath))
  }

  function get(remotePath, localPath) {
    if (!remotePath)
      return state
    if (!localPath)
      return raw('get '+ escapeshell(remotePath))
    return raw('get '+ escapeshell(remotePath) +' -o '+ escapeshell(localPath))
  }

  function mv(_from, to) {
    if (!_from || !to)
      return state
    return raw('mv '+ escapeshell(_from) +' '+ escapeshell(to))
  }

  function rm() { return raw('rm '+ _.map(arguments, escapeshell).join(' ')) }

  function rmdir() { return raw('rmdir '+ _.map(arguments, escapeshell).join(' ')) }

  function raw(cmd) {
    if (cmd && typeof cmd === 'string')
      cmds.push(cmd)
    return state;
  }

  return state;
}

FTP.escapeshell = cmd => cmd.replace(/(["\s'$`\\])/g,'\\$1');

module.exports = FTP
