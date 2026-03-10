# AMI Configuration Instructions for Telephony Contractor

## Overview

The Elemental Reception Portal middleware connects to Asterisk/FreePBX via the Asterisk Manager Interface (AMI) to receive call events. This document describes the required AMI configuration on the telephony server.

## Requirements

- Asterisk or FreePBX with AMI enabled
- TCP port 5038 accessible from the middleware server
- A dedicated AMI user with read-only access to call events

---

## Configuration Steps

### 1. Locate the configuration file

- **Asterisk:** `/etc/asterisk/manager.conf`
- **FreePBX:** `/etc/asterisk/manager_custom.conf` (preferred) or `/etc/asterisk/manager.conf`

For FreePBX, use `manager_custom.conf` to avoid overwriting changes during system updates.

### 2. Add the AMI user section

Add the following block (replace placeholders with actual values):

```ini
[erp_middleware]
secret = <SECURE_PASSWORD>
deny = 0.0.0.0/0.0.0.0
permit = <MIDDLEWARE_SERVER_IP>/32
read = call,system
write = no
```

**Placeholders:**
- `<SECURE_PASSWORD>` — Strong password (e.g. 16+ random characters). Share securely with the middleware operator.
- `<MIDDLEWARE_SERVER_IP>` — Public IP address of the server running the Elemental Reception Portal backend. Only this IP may connect.

### 3. Ensure general section is configured

The `[general]` section should include:

```ini
[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0
```

### 4. Apply changes

```bash
# Reload Asterisk manager
asterisk -rx "manager reload"

# Or restart Asterisk (if needed)
systemctl restart asterisk
```

### 5. Verify

```bash
# Check that the user exists
asterisk -rx "manager show users"

# Test TCP connection from middleware server
telnet <PBX_IP> 5038
```

---

## Credentials to provide

After configuration, provide the following to the middleware operator:

| Parameter | Value |
|-----------|-------|
| AMI_HOST | IP or hostname of the PBX |
| AMI_PORT | 5038 (default) |
| AMI_USERNAME | erp_middleware |
| AMI_PASSWORD | \<the secret you configured\> |

---

## Security notes

- Restrict `permit` to the middleware server IP only. Do not use `permit = 0.0.0.0/0.0.0.0`.
- Use a strong, unique password for the AMI user.
- Ensure port 5038 is not exposed to the public internet unless the middleware server has a static public IP and firewall rules are in place.

---

## Events used

The middleware subscribes to these AMI events:

| Event | Purpose |
|-------|---------|
| Newchannel | Detect incoming call, capture Caller ID |
| AgentConnect | Operator answered, capture extension |
| Hangup | Call ended, capture duration |

No write permissions are required.
