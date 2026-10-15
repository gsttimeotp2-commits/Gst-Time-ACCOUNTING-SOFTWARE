# Security Specification & Threat Model - BillPulse AI

## 1. Data Invariants
1. **Zero-Trust Multi-Tenancy**: All collections (`parties`, `items`, `transactions`, `expenses`, `payments`) and user business profiles are strictly nested under `/users/{userId}`.
2. **User Identity Boundary**: A user with UID `X` can NEVER read, create, update, or delete any record under `/users/{Y}` where `Y != X`.
3. **Payload Identity Integrity**: Any document created under `/users/{userId}` MUST have `incoming().userId == request.auth.uid` and `userId == request.auth.uid`.
4. **Immutability of Key Identity Fields**: Once written, `userId` cannot be modified during an update.
5. **String Bound Hardening**: Every string field must enforce strict `.size()` constraints to prevent Denial-of-Wallet attacks.

## 2. The Dirty Dozen Payloads (Designed to Fail)
1. **Unauthenticated Read on Profile**: User without auth attempts `GET /users/user123/profile`. Must return `PERMISSION_DENIED`.
2. **Cross-Tenant Party Creation**: Authenticated user `user_A` attempts `POST /users/user_B/parties/p1` with `userId: "user_B"`. Must return `PERMISSION_DENIED`.
3. **Identity Spoofing in Transaction**: Authenticated user `user_A` attempts `POST /users/user_A/transactions/tx1` with spoofed `userId: "user_B"`. Must return `PERMISSION_DENIED`.
4. **Denial-of-Wallet Long String Attack**: User `user_A` attempts to inject a 10MB string into `businessName` on profile. Must return `PERMISSION_DENIED`.
5. **Path Variable ID Poisoning**: Path ID contains malicious script/null bytes (e.g. `p%00inject`). Must return `PERMISSION_DENIED`.
6. **Cross-Tenant Item Theft**: User `user_B` attempts to read `GET /users/user_A/items/item1`. Must return `PERMISSION_DENIED`.
7. **Cross-Tenant Expense Deletion**: User `user_B` attempts `DELETE /users/user_A/expenses/exp1`. Must return `PERMISSION_DENIED`.
8. **Immutability Breach on UserId**: User `user_A` attempts to update `transactions/tx1` changing `userId` to `user_B`. Must return `PERMISSION_DENIED`.
9. **Unauthenticated List on Transactions**: Anonymous/unauth client attempts `LIST /users/user_A/transactions`. Must return `PERMISSION_DENIED`.
10. **Shadow Key Injection**: User attempts to inject unauthorized privilege escalation keys into profile. Must return `PERMISSION_DENIED`.
11. **Negative Price Bypass**: Malicious client attempts to save an item with non-numeric or missing required name/price fields. Must return `PERMISSION_DENIED`.
12. **Cross-Tenant Payment List Query**: Attacker queries `payments` subcollection under a competitor's tenant ID. Must return `PERMISSION_DENIED`.
