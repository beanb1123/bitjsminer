import time
import hashlib
import struct
from functools import reduce
import tracemalloc
import asyncio

DEFAULT_LOG_INTERVAL = 10

class Miner:
    def __init__(self, job, log_interval=10):
        self.job = job
        self.log_interval = log_interval if log_interval else DEFAULT_LOG_INTERVAL
        self.log_counter = self.log_interval
        self.nonce = 0

    async def scanhash(self, midstate, data, hash1, target):
        self.nonce = 0
        log = True  # Define log variable

        while True:
            # The nonce goes into the 4th 32-bit word
            data[4] = self.nonce
            
            # If logging is enabled, output the current nonce
            if log:
                self.log_counter -= 1
                if self.log_counter <= 0:
                    print(f'Current nonce: {self.nonce:x}')
                    self.log_counter = self.log_interval  # Resets to default value

            # Now let us see if this nonce results in a Golden Hash
            hash = sha256_chunk(midstate, data)
            hash = sha256_chunk(SHA_256_INITIAL_STATE, hash + hash1)

            if is_golden_hash(hash, target):
                print('Found the nonce for this block!')
                return self.nonce

            # If this was the last possible nonce, quit
            if self.nonce == 0xFFFFFFFF:
                break

            # Increment nonce
            self.nonce = safe_add(self.nonce, 1)

        return None  # Changed to None for clarity

    async def start_mining(self):
        coinbase_str = self.job['coinbase1'] + self.job['extranonce1'] + self.job['extranonce2'] + self.job['coinbase2']
        coinbase = hexstring_to_binary(coinbase_str)
        merkle_hash = reduce(lambda hash, merkle: sha256_chunk(hash, merkle), self.job['merkleBranches'], SHA_256_INITIAL_STATE)

        print('Beginning mining in 3 seconds')
        print('Press Control-C to cancel at any time')
        print()

        await asyncio.sleep(3)  # Use async sleep
        print('Mining has begun!')

        # Capture the memory allocation snapshot before mining
        snapshot_before = tracemalloc.take_snapshot()
        
        result = await self.scanhash(hexstring_to_binary(self.job['previousHeader']), coinbase, merkle_hash, hexstring_to_binary('0x000000000000000000000000000000000000000000000000000000000000000F'))
        
        # Capture the memory allocation snapshot after mining
        snapshot_after = tracemalloc.take_snapshot()
        
        # Compare the snapshots to see memory allocations
        top_stats = snapshot_after.compare_to(snapshot_before, 'lineno')
        print("[ Top 10 memory allocations ]")
        for stat in top_stats[:10]:
            print(stat)

        nonce = 'FFFFFFFF'
        if result is not None:
            print('Block completed, submitting')
            nonce = result
        else:
            print('Share completed, submitting')

        print(self.job['id'], self.job['extranonce2'], self.job['nTime'], nonce)

def is_golden_hash(hash, target):
    return hash[7] == 0x00000000

def hexstring_to_binary(hex_str):
    if len(hex_str) % 2 != 0:
        raise ValueError("Hex string must have an even length")
    
    result = []
    for i in range(0, len(hex_str), 8):
        number = 0x00000000
        for j in range(4):
            number += hex_to_byte(hex_str[i + j * 2:i + j * 2 + 2]) << (j * 8)
        result.append(number)
    return result

def hex_to_byte(hex_str):
    return int(hex_str, 16)

# Example SHA helper functions (you need to implement these)
def sha256_chunk(midstate, data):
    return list(struct.unpack('>8L', hashlib.sha256(b''.join(map(lambda x: struct.pack('>L', x), midstate + data))).digest()))

def safe_add(a, b):
    return (a + b) & 0xFFFFFFFF

SHA_256_INITIAL_STATE = [0] * 8  # Placeholder for the actual SHA-256 initial state

job = {
    'id': '00001712',
    'previousHeader': '37613c86fc920a51b223eebd078d02f539e0225e03124baf0000000000000000',
    'coinbase1': '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff2703b846020490ef216700',
    'coinbase2': '142f746f702e706f6f6c2d6d6f73636f772e72752f00000000020000000000000000266a24aa21a9ed85de2fb81a1bd6b5720eeae6b73c49dd9ffe0b92017daa8059f0ce36501d293c340d3d97000000001976a91414bf6d426f320408b541d96d00431330926090a588ac00000000',
    'merkleBranches': [
        '01633815742b28c045a6010ee9610f6d1855dc3c98e3d0d25978334de21c6aca',
        '999b86fd6e080536010de6c026ab064a8a7979992d25e546510d31ecc5af7082',
        '56f1a373ec266ab0b3dab48e6e0e359cb8875d9be12a27312e1f3fb8da9c674b',
        '5f531f242c42ac7629f22a6e8131192e7e94727bdc191c7165cad8ff14b30d92',
        '209870e38f3b25448fb238cb2be1bcf5a75573716b8779c5714c9313b771e9b4',
        '318058b2b2bcecd762efa33f39ecfd408da1d403842cdb8547e8777cd8b141c9',
        '9dd81fdb1514f375500d7d3289e745ff4396bd9c77eeaaddcd867b414b3e9078',
        'f1fafb44c115ee061a410fbba8af9fc0ef5a0026b73a49d5df788a814411bff4',
        '2ea8ae9a71fe9ad340fe1f8dec66284eabe4913ee4f5214f89907a09fe65c1a7',
        '2823109b2c030b8c94a5382dd32922fe71dc0eebd317ff20ef026777dd67143a',
        '1fbc34b483125f589fafa3779d4cdaacd80cf09ee4a656cf0705adf7b452a2ac',
        '3de0cd75bc32a48a71074ca7619edb745d4223f35189bd3c46d350975397650d',
        '1c5b0424ef6d782935d6be36f1cd95f55fc69a3a066aef5a25870773a73e1f0b'
    ],
    'blockVersion': '20000000',
    'nBit': '18163ad8',
    'nTime': '6721ef90',
    'extranonce1': 'f0005a4a',
    'extranonce2': '00000000',
    'extranonce2_size': 4
}

# Use asyncio to run the mining process
asyncio.run(Miner(job, 10).start_mining())
