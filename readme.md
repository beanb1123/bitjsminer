# Is this done yet?
That depends on your defintion of done, so probably not, but maybe yes.

There's a lot of functionality that's missing, it's not very efficient (it could at least be parallelized), you can't pause the miner in any sort of way, and there's a host of other issues.

But it at least appears to work

Bitcoin JavaScript Miner
========================

What is it?
-----------
It's an node module that allows you to mine bitcoins.

Originally it was going to work with the browser using browserify, but that quickly reached several technical limitations. While browserify is a fantastic resource for implementing functionality that doesn't involve IO, once you enter that realm it becomes extremely difficult to get it to work properly, if at all. This project involves utilization of the node-stratum library to make a connection to a JSON-RPC server. At  the moment, doing this entirely through the browser doesn't appear to be possible unless HTTP is used as a fallback, and exclusivley.

How do I use it?
----------------
Just install the dependencies and execute the main file with node.

To install dependencies, simply execute `npm install` from the cloned repository directory.

Does It Really Mine Bitcoins?
-----------------------------

Yes, but it's so inneficient that you may not actually be able to mine anything depending on how the pool distributes shares. In order for it to be effective you may have to conistently run it to make sure you're constantly getting shares, so pick an appropriate mining pool if you want to even attempt to actually make some bitcoins.

However, even the pools now give share difficulties that are so high that it takes an enormous amount of time for a CPU to complete and submit a single share. All of those bitcoin mining facilities in the artic tundra have made it quite difficult to do anything without a super optimized device.

## How Is This Useful?

While it's incredibly inneficient, it's a great way to understand how bitcoin mining actually works. It exposes methods for dealing with actual integers using pure JavaScript. It shows you how to extend an existing JavaScript object and monkey patch it to make it work for you (the node-stratum client doesn't work out of the box).

You could also potentially use this for mining alt coins where it would have a much better chance at not performing terribly. Just as long as the algorithm for hashing is the same (SHA256), you only need to change the pool for it to work properly.