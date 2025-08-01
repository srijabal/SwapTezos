import smartpy as sp

@sp.module
def main():
    """
    SwapTezos HTLC Escrow Contract
    
    Hash Time-Locked Contract implementation for cross-chain atomic swaps between
    Ethereum and Tezos. Supports both XTZ and FA2 token escrows with hash-lock
    and time-lock mechanisms for secure atomic swaps.
    """
    
    # Type definitions for contract storage and parameters
    swap_type: type = sp.record(
        swap_id=sp.nat,
        maker=sp.address,
        taker=sp.option[sp.address],
        amount=sp.mutez,
        token_address=sp.option[sp.address],
        token_id=sp.option[sp.nat],
        token_amount=sp.option[sp.nat],
        secret_hash=sp.bytes,
        timelock=sp.timestamp,
        status=sp.string,
        created_at=sp.timestamp
    )
    
    create_swap_params: type = sp.record(
        taker=sp.option[sp.address],
        secret_hash=sp.bytes,
        timelock_hours=sp.nat,
        token_address=sp.option[sp.address],
        token_id=sp.option[sp.nat],
        token_amount=sp.option[sp.nat]
    )
    
    claim_swap_params: type = sp.record(
        swap_id=sp.nat,
        secret=sp.bytes
    )
    
    refund_swap_params: type = sp.record(
        swap_id=sp.nat
    )
    
    # FA2 transfer type (defined once at module level)
    fa2_transfer_type: type = sp.list[
        sp.record(
            from_=sp.address,
            txs=sp.list[
                sp.record(
                    to_=sp.address,
                    token_id=sp.nat,
                    amount=sp.nat
                )
            ]
        )
    ]

    class HTLCEscrow(sp.Contract):
        def __init__(self, admin_address: sp.address):
            """
            Initialize the HTLC Escrow contract
            
            Args:
                admin_address: Admin address for contract management
            """
            # Initialize contract storage
            self.data.next_swap_id = sp.nat(1)
            self.data.swaps = sp.cast(sp.big_map(), sp.big_map[sp.nat, swap_type])  
            self.data.admin = admin_address
            self.data.fee_percentage = sp.nat(10)  # 0.1% fee (10 basis points)
            self.data.collected_fees = sp.mutez(0)
            self.data.paused = False

        @sp.entrypoint
        def create_swap(self, params: create_swap_params):
            """
            Create a new HTLC swap escrow
            
            Args:
                params: Swap creation parameters
            """
            # Contract must not be paused
            assert not self.data.paused, "CONTRACT_PAUSED"
            
            # Validate timelock parameters
            assert params.timelock_hours >= 1, "TIMELOCK_TOO_SHORT"
            assert params.timelock_hours <= 168, "TIMELOCK_TOO_LONG"  # Max 1 week
            
            # Validate secret hash length (32 bytes for SHA256)
            assert sp.len(params.secret_hash) == 32, "INVALID_SECRET_HASH_LENGTH"
            
            # Calculate expiration timestamp
            timelock_seconds = params.timelock_hours * 3600
            timelock = sp.add_seconds(sp.now, sp.to_int(timelock_seconds))
            
            # Handle token or XTZ deposit
            amount = sp.mutez(0)
            if params.token_address.is_some():
                # FA2 token swap
                assert params.token_amount.is_some(), "TOKEN_AMOUNT_REQUIRED"
                assert params.token_amount.unwrap_some() > 0, "INVALID_TOKEN_AMOUNT"
                
                # Get token contract
                token_contract_opt = sp.contract(
                    fa2_transfer_type,
                    params.token_address.unwrap_some(),
                    "transfer"
                )
                assert token_contract_opt.is_some(), "INVALID_TOKEN_CONTRACT"
                token_contract = token_contract_opt.unwrap_some()
                
                # Prepare transfer parameters
                transfer_param = [sp.record(
                    from_=sp.sender,
                    txs=[sp.record(
                        to_=sp.self_address,
                        token_id=params.token_id.unwrap_some(),
                        amount=params.token_amount.unwrap_some()
                    )]
                )]
                
                # Transfer tokens to contract
                sp.transfer(transfer_param, sp.mutez(0), token_contract)
            else:
                # XTZ swap
                assert sp.amount > sp.mutez(0), "AMOUNT_REQUIRED"
                amount = sp.amount
                
                # Calculate and collect fee for XTZ swaps
                fee_amount = sp.split_tokens(amount, self.data.fee_percentage, 10000)
                net_amount = sp.amount - fee_amount
                self.data.collected_fees += fee_amount
                amount = net_amount
            
            # Create swap record
            swap_id = self.data.next_swap_id
            swap_data = sp.record(
                swap_id=swap_id,
                maker=sp.sender,
                taker=params.taker,
                amount=amount,
                token_address=params.token_address,
                token_id=params.token_id,
                token_amount=params.token_amount,
                secret_hash=params.secret_hash,
                timelock=timelock,
                status="active",
                created_at=sp.now
            )
            
            # Store swap and increment counter
            self.data.swaps[swap_id] = swap_data
            self.data.next_swap_id += 1

        @sp.entrypoint  
        def claim_swap(self, params: claim_swap_params):
            """
            Claim a swap by revealing the correct secret
            
            Args:
                params: Claim parameters with swap_id and secret
            """
            # Contract must not be paused
            assert not self.data.paused, "CONTRACT_PAUSED"
            
            # Verify swap exists
            assert self.data.swaps.contains(params.swap_id), "SWAP_NOT_FOUND"
            swap = self.data.swaps[params.swap_id]
            
            # Verify swap is active
            assert swap.status == "active", "SWAP_NOT_ACTIVE"
            
            # Verify swap hasn't expired
            assert sp.now < swap.timelock, "SWAP_EXPIRED"
            
            # Verify secret hash matches
            computed_hash = sp.sha256(params.secret)
            assert computed_hash == swap.secret_hash, "INVALID_SECRET"
            
            # Verify claimer authorization (if taker is specified)
            if swap.taker.is_some():
                assert sp.sender == swap.taker.unwrap_some(), "UNAUTHORIZED_CLAIMER"
            
            # Update swap status to claimed
            updated_swap = sp.record(
                swap_id=swap.swap_id,
                maker=swap.maker,
                taker=swap.taker,
                amount=swap.amount,
                token_address=swap.token_address,
                token_id=swap.token_id,
                token_amount=swap.token_amount,
                secret_hash=swap.secret_hash,
                timelock=swap.timelock,
                status="claimed",
                created_at=swap.created_at
            )
            self.data.swaps[params.swap_id] = updated_swap
            
            # Transfer escrowed assets
            if swap.token_address.is_some():
                # Transfer FA2 tokens to claimer
                token_contract_opt = sp.contract(
                    fa2_transfer_type,
                    swap.token_address.unwrap_some(),
                    "transfer"
                )
                assert token_contract_opt.is_some(), "INVALID_TOKEN_CONTRACT"
                token_contract = token_contract_opt.unwrap_some()
                
                transfer_param = [sp.record(
                    from_=sp.self_address,
                    txs=[sp.record(
                        to_=sp.sender,
                        token_id=swap.token_id.unwrap_some(),
                        amount=swap.token_amount.unwrap_some()
                    )]
                )]
                sp.transfer(transfer_param, sp.mutez(0), token_contract)
            else:
                # Transfer XTZ to claimer
                sp.send(sp.sender, swap.amount)

        @sp.entrypoint
        def refund_swap(self, params: refund_swap_params):
            """
            Refund an expired swap back to the maker
            
            Args:
                params: Refund parameters with swap_id
            """
            # Verify swap exists
            assert self.data.swaps.contains(params.swap_id), "SWAP_NOT_FOUND"
            swap = self.data.swaps[params.swap_id]
            
            # Verify swap is active
            assert swap.status == "active", "SWAP_NOT_ACTIVE"
            
            # Verify timelock has expired
            assert sp.now >= swap.timelock, "SWAP_NOT_EXPIRED"
            
            # Verify caller is the maker
            assert sp.sender == swap.maker, "UNAUTHORIZED_REFUNDER"
            
            # Update swap status to refunded
            updated_swap = sp.record(
                swap_id=swap.swap_id,
                maker=swap.maker,
                taker=swap.taker,
                amount=swap.amount,
                token_address=swap.token_address,
                token_id=swap.token_id,
                token_amount=swap.token_amount,
                secret_hash=swap.secret_hash,
                timelock=swap.timelock,
                status="refunded",
                created_at=swap.created_at
            )
            self.data.swaps[params.swap_id] = updated_swap
            
            # Return escrowed assets to maker
            if swap.token_address.is_some():
                # Return FA2 tokens to maker
                token_contract_opt = sp.contract(
                    fa2_transfer_type,
                    swap.token_address.unwrap_some(),
                    "transfer"
                )
                assert token_contract_opt.is_some(), "INVALID_TOKEN_CONTRACT"
                token_contract = token_contract_opt.unwrap_some()
                
                transfer_param = [sp.record(
                    from_=sp.self_address,
                    txs=[sp.record(
                        to_=swap.maker,
                        token_id=swap.token_id.unwrap_some(),
                        amount=swap.token_amount.unwrap_some()
                    )]
                )]
                sp.transfer(transfer_param, sp.mutez(0), token_contract)
            else:
                # Return XTZ to maker
                sp.send(swap.maker, swap.amount)

        # Admin functions
        @sp.entrypoint
        def set_admin(self, new_admin: sp.address):
            """Change contract admin (admin only)"""
            assert sp.sender == self.data.admin, "ADMIN_ONLY"
            self.data.admin = new_admin

        @sp.entrypoint
        def set_fee_percentage(self, new_fee: sp.nat):
            """Set fee percentage (admin only)"""
            assert sp.sender == self.data.admin, "ADMIN_ONLY"
            assert new_fee <= 500, "FEE_TOO_HIGH"  # Max 5%
            self.data.fee_percentage = new_fee

        @sp.entrypoint
        def pause_contract(self):
            """Pause contract operations (admin only)"""
            assert sp.sender == self.data.admin, "ADMIN_ONLY"
            self.data.paused = True

        @sp.entrypoint
        def unpause_contract(self):
            """Unpause contract operations (admin only)"""
            assert sp.sender == self.data.admin, "ADMIN_ONLY"
            self.data.paused = False

        @sp.entrypoint
        def withdraw_fees(self, recipient: sp.address):
            """Withdraw collected fees (admin only)"""
            assert sp.sender == self.data.admin, "ADMIN_ONLY"
            assert self.data.collected_fees > sp.mutez(0), "NO_FEES_TO_WITHDRAW"
            
            amount = self.data.collected_fees
            self.data.collected_fees = sp.mutez(0)
            sp.send(recipient, amount)

        # View functions
        @sp.onchain_view
        def get_swap(self, swap_id: sp.nat) -> swap_type:
            """Get swap details by ID"""
            assert self.data.swaps.contains(swap_id), "SWAP_NOT_FOUND"
            return self.data.swaps[swap_id]

        @sp.onchain_view
        def get_next_swap_id(self) -> sp.nat:
            """Get next available swap ID"""
            return self.data.next_swap_id

        @sp.onchain_view
        def get_collected_fees(self) -> sp.mutez:
            """Get total collected fees"""
            return self.data.collected_fees
        
        @sp.onchain_view
        def is_paused(self) -> sp.bool:
            """Check if contract is paused"""
            return self.data.paused




@sp.add_test()
def test():
    scenario = sp.test_scenario("HTLCEscrow tests", main)
    
    # Test accounts
    admin = sp.test_account("admin")
    alice = sp.test_account("alice")
    bob = sp.test_account("bob")
    
    # Deploy contract
    htlc = main.HTLCEscrow(admin.address)
    scenario += htlc
    
    # Test secret and hash
    secret = sp.bytes("0x" + "12" * 32)
    secret_hash = sp.sha256(secret)
    
    # Test 1: Create XTZ swap
    htlc.create_swap(
        taker=sp.some(bob.address),
        secret_hash=secret_hash,
        timelock_hours=24,
        token_address=sp.none,
        token_id=sp.none,
        token_amount=sp.none,
        _sender=alice.address,
        _amount=sp.tez(1)
    )
    
    # Test 2: Claim swap with correct secret
    htlc.claim_swap(
        swap_id=1,
        secret=secret,
        _sender=bob.address
    )
    
    # Test 3: Create another swap for refund test
    htlc.create_swap(
        taker=sp.none,
        secret_hash=secret_hash,
        timelock_hours=1,
        token_address=sp.none,
        token_id=sp.none,
        token_amount=sp.none,
        _sender=alice.address,
        _amount=sp.tez(2)
    )
    
    # Test 4: Invalid claim with wrong secret should fail
    wrong_secret = sp.bytes("0x" + "34" * 32)
    htlc.claim_swap(
        swap_id=2,
        secret=wrong_secret,
        _sender=alice.address,
        _valid=False
    )
    
    # Verify contract state
    scenario.verify(htlc.data.next_swap_id == 3)