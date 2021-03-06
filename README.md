node-ftps-promise
=========

Fork of [node-ftps](https://github.com/Atinux/node-ftps) using available ES6 in node 4.2.1 and Promises

FTP, FTPS and SFTP client for node.js, mainly a `lftp` wrapper.

Requirements
------------

You need to have the executable `lftp` installed on your computer.

[LFTP Homepage](http://lftp.yar.ru/)

[LFTP For Windows](https://nwgat.ninja/lftp-for-windows/)

Installation
-----------

``` sh
npm install ftps
```

Usage
-----

``` js
var FTPS = require('ftps');
var ftps = FTPS({
  host: 'domain.com', // required
  username: 'Test', // required
  password: 'Test', // required
  protocol: 'sftp', // optional, values : 'ftp', 'sftp', 'ftps',... default is 'ftp'
  // protocol is added on beginning of host, ex : sftp://domain.com in this case
  port: 22, // optional
  // port is added to the end of the host, ex: sftp://domain.com:22 in this case
  escape: true, // optional, used for escaping shell characters (space, $, etc.), default: true
  retries: 2, // Optional, defaults to 1 (1 = no retries, 0 = unlimited retries)
  timeout: 10,
  requiresPassword: true, // Optional, defaults to true
  autoConfirm: true, // Optional, is used to auto confirm ssl questions on sftp or fish protocols, defaults to false
  cwd: '' // Optional, defaults to the directory from where the script is executed 
});
// Do some amazing things
ftps.cd('some_directory').addFile(__dirname + '/test.txt').then(console.log);
```

Some documentation
------------------

Here are some of the chainable functions :

``` js
ftps.ls()
ftps.pwd()
ftps.cd(directory)
ftps.cat(pathToRemoteFiles)
ftps.put(pathToLocalFile, [pathToRemoteFile]) // alias: addFile
ftps.get(pathToRemoteFile, [pathToLocalFile]) // download remote file and save to local path (if not given, use same name as remote file), alias: getFile
ftps.mv(from, to) // alias move
ftps.rm(file1, file2, ...) // alias remove
ftps.rmdir(directory1, directory2, ...)
```

If you want to escape some arguments because you used "escape: false" in the options:
```js
ftps.escapeshell('My folder');
// Return 'My\\ \\$folder'
```

Execute a command on the remote server:
```js
ftps.raw('ls -l')
```

To see all available commands: [LFTP Commands](http://lftp.yar.ru/lftp-man.html)

For information, ls, pwd, ... rm are just some alias of raw() method.

Run the commands
``` js
ftps.exec().then(res => {
  // res is an hash with { error: stderr, data: stdout }
});
// exec() return a promise
```

Also, take note that if a command fails it will not stop the next commands from executing, for example:
``` js
ftps.cd('non-existing-dir/').addFile('./test.txt').then(console.log);
/*
Will add file on ~/ and give:
{
  error: 'cd: non-existing-dir: No such file or directory\n',
  data: ''
}
So...be cautious because ./test.txt has been added
*/

```
Why?
----

Because I wantded to be able to compose it with promises and wanted methods to be first-class, so avoid the hassle of prototype.
