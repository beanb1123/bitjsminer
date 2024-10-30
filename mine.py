import asyncio
import hashlib
import struct
import socket
import json
import argparse

DEFAULT_LOG_INTERVAL = 10000

class Client:
    def __init__(self, wallet, domain, port, password='x'):
        self.wallet = wallet
        self.domain = domain
        self.port = port
        self.password = password
        self.subscription = []
        self.jobs = []
        self.difficulty = None
        self.target = None
        self.socket = None

    async def connect(self):
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.connect((self.domain, self.port))
        await self.subscribe()

    async def subscribe(self):
        # Subscribe to the server
        self.send({"method": "mining.subscribe", "params": []})
        response = await self.recv()
        print("Successfully connected to the pool")
        self.emit("mining.subscribe", response)

    def emit(self, method, params):
        if method == "mining.subscribe":
            self.subscription = params
            self.authorize()
        elif method == "mining.notify":
            self.handle_mining_notify(params)

    def authorize(self):
        self.send({"method": "mining.authorize", "params": [self.wallet, self.password]})

    def handle_mining_notify(self, data):
        job = {
            'id': data[0],
            'previousHeader': data[1],
            'coinbase1': data[2],
            'coinbase2': data[3],
            'merkleBranches': data[4],
            'blockVersion': data[5],
            'nBit': data[6],
            'nTime': data[7],
            'extranonce1': self.subscription[1],
            'extranonce2_size': self.subscription[2]
        }
        print('Received a new mining job:')
        print(job)
        print()
        miner = Miner(self, job)
        asyncio.run(miner.start_mining())

    def send(self, data):
        self.socket.sendall((json.dumps(data) + '\n').encode())

    async def recv(self):
        response = self.socket.recv(1024).decode()
        return json.loads(response)

    def close(self):
        self.socket.close()

class Miner:
    def __init__(self, client, job, log=None, log_interval=None):
        self.client = client
        self.job = job
        self.log_interval = log_interval if log_interval else DEFAULT_LOG_INTERVAL
        self.log_counter = self.log_interval
        self.nonce = 0
        self.log = log

    async def scanhash(self, midstate, data, hash1, target):
        self.nonce = 0

        while True:
            data[4] = self.nonce
            
            if self.log:
                self.log_counter -= 1
                if self.log_counter <= 0:
                    print(f'Current nonce: {self.nonce:x}')
                    self.log_counter = self.log_interval

            hash = self.sha256_chunk(midstate, data)
            hash = self.sha256_chunk(SHA_256_INITIAL_STATE, hash + hash1)

            if self.is_golden_hash(hash, target):
                print('Found the nonce for this block!')
                return self.nonce

            if self.nonce == 0xFFFFFFFF:
                break

            self.nonce = self.safe_add(self.nonce, 1)
            await asyncio.sleep(0.001)

        return False

    async def start_mining(self):
        coinbase_str = self.job['coinbase1'] + self.job['extranonce1'] + self.job['extranonce2'] + self.job['coinbase2']
        coinbase = self.hexstring_to_binary(coinbase_str)
        merkle_hash = SHA_256_INITIAL_STATE
        
        for merkle in self.job['merkleBranches']:
            merkle_hash = self.sha256_chunk(merkle_hash, self.hexstring_to_binary(merkle))

        print('Beginning mining...')
        result = await self.scanhash(
            self.hexstring_to_binary(self.job['previousHeader']),
            coinbase,
            merkle_hash,
            self.hexstring_to_binary(self.client.target)
        )
        
        if result:
            print('Block completed, submitting')
            nonce = result
        else:
            print('Share completed, submitting')
            nonce = 'FFFFFFFF'

        self.client.send({
            "method": "mining.submit",
            "params": [self.client.wallet, self.job['id'], self.job['extranonce2'], self.job['nTime'], nonce]
        })

    def sha256_chunk(self, midstate, data):
        data_bytes = b''.join(struct.pack('<I', x) for x in data)
        hasher = hashlib.sha256()
        hasher.update(midstate)
        hasher.update(data_bytes)
        return list(struct.unpack('<8I', hasher.digest()))

    def is_golden_hash(self, hash, target):
        return hash[7] == 0x00000000

    def hexstring_to_binary(self, hex_str):
        result = []
        for i in range(0, len(hex_str), 8):
            number = 0
            for j in range(4):
                number += self.hex_to_byte(hex_str[i + j * 2:i + j * 2 + 2]) << (j * 8)
            result.append(number)
        return result

    def hex_to_byte(self, hex_str):
        return int(hex_str, 16)

    def safe_add(self, x, y):
        return (x + y) & 0xFFFFFFFF

SHA_256_INITIAL_STATE = struct.pack('<8I',
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
)

def calculate_target(difficulty):
    max_target = (0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF // difficulty)
    return hex(max_target)[2:].zfill(64)

def main():
    parser = argparse.ArgumentParser(description='Bitcoin Miner v1.0.0')
    parser.add_argument('--wallet', help='Wallet address for the pool')
    parser.add_argument('--password', help='Password (usually x)')
    parser.add_argument('--port', type=int, default=8488, help='Port to connect to the pool')
    parser.add_argument('--domain', default='solo.pool-moscow.ru', help='Pool domain to connect to')
    parser.add_argument('--log', action='store_true', help='Enables logging of current nonce')
    parser.add_argument('--interval', type=int, default=DEFAULT_LOG_INTERVAL, help='Logging interval for nonce reporting')
    args = parser.parse_args()

    WALLET = args.wallet if args.wallet else '17WkbTWLivsSC1quuH4aJUbfTNwaykTXUZ'
    POOL_DOMAIN = args.domain
    POOL_PORT = args.port

    print(f'Pool: {POOL_DOMAIN}:{POOL_PORT}')
    print(f'Wallet: {WALLET}')
    print()

    client = Client(WALLET, POOL_DOMAIN, POOL_PORT, args.password if args.password else 'x')
    asyncio.run(client.connect())

if __name__ == '__main__':
    main()
