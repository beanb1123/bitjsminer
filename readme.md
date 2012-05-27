Bitcoin JavaScript Miner
========================

**Current Status**: Alpha


What is it?
-----------

This is a Bitcoin Miner implemented in JavaScript. 
Originally by [progranism](https://github.com/progranism/Bitcoin-JavaScript-Miner), improved by [kr105rlz](https://github.com/kr105rlz)
and [cmaclell](https://github.com/cmaclell/Bitcoin-JavaScript-Miner), here modified by me to work on [GAE](http://appengine.google.com).

It is intended for use
in a [Bitcoin Mining Pool](https://en.bitcoin.it/wiki/Pooled_mining), but
its main purpose is to act as a learning tool and micro web miner. Feel free to browse the commented source-code
and learn more about how Bitcoins are mined.

[Learn more about Bitcoin](http://www.bitcoin.org/ "Bitcoin")


How do I use it?
----------------

Download the full source code. You need a Google App Engine application defined and ready for code to be uploaded.
Modify the app.yaml according to your application name, rename or copy config.py.sample to config.py and modify it to use your pool credentials. Open the "ninja" w.html page in your app path and you're off to mine!



Does It Really Mine Bitcoins?
-----------------------------

Yes, though it isn't very good at mining! It operates much slower
than even a standard CPU miner, and so it is unlikely to generate much income. However it can be loaded on a website so your visitors can calculate bitcoins for you.


***Important***
---------------

***Please read***, this miner doesn't implement any real long-polling or caching techniques to minimize unnecessary connections too the pool server.
Instead, it polls every hour the pool server you configured and "replaces" any work holder than an hour with the received one.
It could well overwrite the same work but 1 connection every hour shouln't disturb too much. Indeed, clients could be working on already solved work.
It is recommended to use it only on local, personal installations before connecting to big (or even small) pools.


Current Development Status
--------------------------

Currently being heavily worked on.


To Do
-----

1) User (client) management



Thank You
---------

If you like this project, feel free contribute code, comments, and even Bitcoin donations.

*Donation Address for cmaclell*: 19ZhyDExua1b6ZzMMfvPdGpQTRnjkWZTYj
*Donation Address for kr105rlz*: 16TUsJ6ToAxp1a9RmTCGnox99MocGSYLaD

