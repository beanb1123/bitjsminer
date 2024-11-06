import pyrx
import requests
import json
import time
import binascii
import struct
import threading
import psutil
from datetime import datetime

class GentleMiner:
    def __init__(self, pool_url, wallet_address, thread_count=1, cpu_limit=10):
        self.pool_url = pool_url
        self.wallet_address = wallet_address
        self.thread_count = thread_count
        self.cpu_limit = cpu_limit
        self.should_mine = False
        self.job = None
        self.threads = []

    def get_job(self):
        """Get new job from pool"""
        login_data = {
            "method": "login",
            "params": {
                "login": self.wallet_address,
                "pass": "x",
                "rigid": "",
                "agent": "gentle-miner/1.0"
            },
            "id": 1
        }
        
        try:
            response = requests.post(self.pool_url, json=login_data)
            result = response.json()
            
            if 'result' in result:
                self.job = result['result']['job']
                return True
            return False
        except Exception as e:
            print(f"Error getting job: {e}")
            return False

    def submit_share(self, result_hash, nonce):
        """Submit share to pool"""
        submit_data = {
            "method": "submit",
            "params": {
                "id": self.wallet_address,
                "job_id": self.job['job_id'],
                "nonce": binascii.hexlify(struct.pack('<I', nonce)).decode(),
                "result": result_hash
            },
            "id": 1
        }
        
        try:
            response = requests.post(self.pool_url, json=submit_data)
            result = response.json()
            return 'result' in result and result['result'].get('status') == 'OK'
        except Exception as e:
            print(f"Error submitting share: {e}")
            return False

    def mine_block(self, thread_id):
        """Mining function for each thread"""
        nonce = thread_id
        
        while self.should_mine:
            if not self.job:
                time.sleep(1)
                continue

            # Prepare input for RandomX
            blob = binascii.unhexlify(self.job['blob'])
            seed_hash = binascii.unhexlify(self.job['seed_hash'])
            target = int(self.job['target'], 16)
            
            # Update nonce in blob
            blob = blob[:39] + struct.pack('<I', nonce) + blob[43:]
            
            # Calculate hash
            result = pyrx.get_rx_hash(blob, seed_hash)
            result_hash = binascii.hexlify(result).decode()
            
            # Check if hash meets target
            if int(result_hash, 16) < target:
                print(f"Share found by thread {thread_id}!")
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

    def start_mining(self):
        """Start mining with specified thread count"""
        if not self.get_job():
            print("Failed to get initial job")
            return

        self.should_mine = True
        print(f"Starting gentle mining with {self.thread_count} threads...")
        print(f"Mining to wallet: {self.wallet_address}")
        print(f"Pool: {self.pool_url}")
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
        for thread in self.threads:
            thread.join()
        print("Mining stopped")

# Example usage
if __name__ == "__main__":
    # Replace with your Monero wallet address
    WALLET = "43KmowBoHqVZxaSP3CkPvsgi7W6kdVk7xB2FNUEQqzrvNnyWXGdt9Z86myrFc3VZZPGExWnqp7GTuR6yjuA1NX6yGaPRn9K"
    # Example pool URL (replace with your preferred pool)
    POOL = "stratum+tcp://pool.supportxmr.com:3333"
    
    miner = GentleMiner(
        pool_url=POOL,
        wallet_address=WALLET,
        thread_count=1,  # Single thread for gentle mining
        cpu_limit=10     # 10% CPU usage limit
    )
    
    try:
        miner.start_mining()
    except KeyboardInterrupt:
        miner.stop_mining()
