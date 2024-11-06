import pyrx
import json
import time
import binascii
import struct
import threading
import psutil
import socket
import select
from datetime import datetime

class GentleMiner:
    def __init__(self, pool_host, pool_port, wallet_address, thread_count=1, cpu_limit=10):
        self.pool_host = pool_host
        self.pool_port = pool_port
        self.wallet_address = wallet_address
        self.thread_count = thread_count
        self.cpu_limit = cpu_limit
        self.should_mine = False
        self.job = None
        self.threads = []
        self.socket = None
        self.id = 1

    def connect_to_pool(self):
        """Connect to mining pool"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect((self.pool_host, self.pool_port))
            return True
        except Exception as e:
            print(f"Connection error: {e}")
            return False

    def send_request(self, method, params):
        """Send request to pool"""
        request = {
            "method": method,
            "params": params,
            "id": self.id
        }
        self.id += 1
        
        try:
            self.socket.send((json.dumps(request) + "\n").encode())
            ready = select.select([self.socket], [], [], 10)
            if ready[0]:
                response = self.socket.recv(4096)
                return json.loads(response.decode())
            return None
        except Exception as e:
            print(f"Error in send_request: {e}")
            return None

    def login(self):
        """Login to pool"""
        login_params = {
            "login": self.wallet_address,
            "pass": "x",
            "rigid": "",
            "agent": "gentle-miner/1.0"
        }
        
        response = self.send_request("login", login_params)
        if response and 'result' in response:
            self.job = response['result']['job']
            print("Successfully logged in to pool")
            return True
        return False

    def get_job(self):
        """Get new job from pool"""
        response = self.send_request("getjob", {"id": self.wallet_address})
        if response and 'result' in response:
            self.job = response['result']
            return True
        return False

    def submit_share(self, result_hash, nonce):
        """Submit share to pool"""
        params = {
            "id": self.wallet_address,
            "job_id": self.job['job_id'],
            "nonce": binascii.hexlify(struct.pack('<I', nonce)).decode(),
            "result": result_hash
        }
        
        response = self.send_request("submit", params)
        return response and 'result' in response and response['result'].get('status') == 'OK'

    def mine_block(self, thread_id):
        """Mining function for each thread"""
        nonce = thread_id
        shares_found = 0
        hashes = 0
        start_time = time.time()
        
        while self.should_mine:
            if not self.job:
                time.sleep(1)
                continue

            try:
                # Prepare input for RandomX
                blob = self.job['blob']
                seed_hash = self.job['seed_hash']
                target = int(self.job['target'], 16)
                
                # Update nonce in blob string
                nonce_hex = format(nonce, '08x')
                blob = blob[:78] + nonce_hex + blob[86:]  # 78 is the nonce position in hex string
                
                # Calculate hash using correct pyrx function signature
                # The third parameter (variant) is usually 0 for RandomX
                result = pyrx.get_rx_hash(blob, seed_hash, 0)
                result_hash = result.hex()
                
                hashes += 1
                elapsed = time.time() - start_time
                if elapsed > 60:  # Print hashrate every minute
                    hashrate = hashes / elapsed
                    print(f"Thread {thread_id} hashrate: {hashrate:.2f} H/s, Shares found: {shares_found}")
                    hashes = 0
                    start_time = time.time()
                
                # Check if hash meets target
                if int(result_hash, 16) < target:
                    print(f"Share found by thread {thread_id}!")
                    shares_found += 1
                    if self.submit_share(result_hash, nonce):
                        print("Share accepted!")
                    else:
                        print("Share rejected.")

                nonce += self.thread_count
                
                # Calculate sleep time based on CPU usage
                cpu_percent = psutil.cpu_percent()
                if cpu_percent > self.cpu_limit:
                    sleep_time = (cpu_percent - self.cpu_limit) / 100.0
                    time.sleep(sleep_time)
                else:
                    time.sleep(0.1)  # Base delay to prevent CPU overuse

            except Exception as e:
                print(f"Error in mining loop: {e}")
                time.sleep(1)

    def start_mining(self):
        """Start mining with specified thread count"""
        if not self.connect_to_pool():
            print("Failed to connect to pool")
            return

        if not self.login():
            print("Failed to login to pool")
            return

        self.should_mine = True
        print(f"Starting gentle mining with {self.thread_count} threads...")
        print(f"Mining to wallet: {self.wallet_address}")
        print(f"Pool: {self.pool_host}:{self.pool_port}")
        print(f"CPU limit: {self.cpu_limit}%")

        # Start mining threads
        for i in range(self.thread_count):
            thread = threading.Thread(target=self.mine_block, args=(i,))
            thread.daemon = True
            thread.start()
            self.threads.append(thread)

        # Main loop to get new jobs
        while self.should_mine:
            try:
                if self.get_job():
                    print(f"New job received at {datetime.now()}")
                time.sleep(5)
            except KeyboardInterrupt:
                self.stop_mining()
                break
            except Exception as e:
                print(f"Error in main loop: {e}")
                time.sleep(5)

    def stop_mining(self):
        """Stop mining"""
        self.should_mine = False
        if self.socket:
            self.socket.close()
        for thread in self.threads:
            thread.join()
        print("Mining stopped")

# Example usage
if __name__ == "__main__":
    # Replace with your Monero wallet address
    WALLET = "43KmowBoHqVZxaSP3CkPvsgi7W6kdVk7xB2FNUEQqzrvNnyWXGdt9Z86myrFc3VZZPGExWnqp7GTuR6yjuA1NX6yGaPRn9K"
    # Pool settings (replace with your preferred pool)
    POOL_HOST = "pool.supportxmr.com"
    POOL_PORT = 3333
    
    miner = GentleMiner(
        pool_host=POOL_HOST,
        pool_port=POOL_PORT,
        wallet_address=WALLET,
        thread_count=1,  # Single thread for gentle mining
        cpu_limit=10     # 10% CPU usage limit
    )
    
    try:
        miner.start_mining()
    except KeyboardInterrupt:
        miner.stop_mining()
