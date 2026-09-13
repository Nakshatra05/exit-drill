/** Keep provider payloads and transaction internals out of product responses. */
export function walletError(error: unknown): { error: string; status: number } {
  const message = error instanceof Error ? error.message : "";
  if (
    /policy_violation|policy.*(denied|reject|violat)|not allowed by.*policy/i.test(
      message,
    )
  )
    return {
      error:
        "Transfer protection blocked this action. It is outside your treasury’s signing limits.",
      status: 403,
    };
  if (
    /jwt|auth.*(required|invalid|expired)|authentication token/i.test(message)
  )
    return {
      error:
        "Your wallet session could not be authorized. Sign out and connect again before retrying.",
      status: 401,
    };
  if (/insufficient funds/i.test(message))
    return {
      error:
        "Your treasury needs Sepolia ETH for network fees. Send test ETH to the treasury address and retry.",
      status: 400,
    };
  if (/allowance|transfer amount|STF|ERC20Insufficient/i.test(message))
    return {
      error:
        "Check your test-token balance and allow the selected amount, then request a new preview.",
      status: 400,
    };
  if (
    /fresh quote|minimum output|expired|TooLittleReceived|Deadline/i.test(
      message,
    )
  )
    return {
      error:
        "Request a fresh preview and review the minimum received before confirming.",
      status: 400,
    };
  if (/another wallet|does not belong/i.test(message))
    return {
      error: "This wallet or receipt belongs to a different account.",
      status: 403,
    };
  if (/policy was removed|no enforced Privy policy/i.test(message))
    return {
      error:
        "Your treasury’s signing limits are missing. Wallet actions are paused.",
      status: 403,
    };
  if (
    /Not a confirmed|Settlement event|reconciliation failed|not found/i.test(
      message,
    )
  )
    return {
      error:
        "A confirmed exit could not be verified yet. Check the transaction and retry after confirmation.",
      status: 400,
    };
  return {
    error:
      "We couldn’t complete this wallet action. Check any pending transaction before retrying.",
    status: 503,
  };
}
