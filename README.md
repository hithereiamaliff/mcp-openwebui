# Open WebUI MCP Server

> 🤖 **Manage your Open WebUI instance through AI assistants** — users, groups, models, knowledge bases, chats, and more!

[![Fork](https://img.shields.io/badge/Fork%20of-troylar%2Fopen--webui--mcp--server-blue)](https://github.com/troylar/open-webui-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Node.js-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)](https://www.docker.com/)

This is a **complete redevelopment** of [troylar/open-webui-mcp-server](https://github.com/troylar/open-webui-mcp-server), rebuilt from the ground up in **TypeScript/Node.js** for **self-hosted VPS deployment** with **Streamable HTTP transport**.

---

## 📖 Table of Contents

- [What is This?](#-what-is-this)
- [Why Was This Redeveloped?](#-why-was-this-redeveloped)
- [What Changed from Original?](#-whats-changed-from-original)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Available Tools](#️-available-tools-60)
- [API Endpoints](#️-api-endpoints)
- [Self-Hosting Guide](#-self-hosting-guide)
- [Troubleshooting](#-troubleshooting)
- [License & Credits](#-license)

---

## 🤔 What is This?

**Open WebUI MCP Server** is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that allows AI assistants like Claude, Cursor, and Windsurf to interact with your [Open WebUI](https://openwebui.com/) instance.

### What is MCP?

MCP (Model Context Protocol) is an open standard that enables AI assistants to connect to external tools and data sources. Think of it as a "plugin system" for AI — it allows Claude and other AI assistants to:

- **Read data** from external services (like your Open WebUI users, chats, models)
- **Take actions** on your behalf (create knowledge bases, manage users, configure models)
- **Integrate seamlessly** without you having to copy-paste data back and forth

### What is Open WebUI?

[Open WebUI](https://openwebui.com/) is a self-hosted web interface for running AI models locally (like Ollama, LLaMA, etc.). It provides:

- Chat interface for AI models
- User and group management
- Knowledge bases (RAG)
- Custom prompts and tools
- And much more...

### What Can You Do With This MCP?

Once connected, you can ask your AI assistant things like:

- *"List all users in my Open WebUI instance"*
- *"Create a new knowledge base called 'Company Docs'"*
- *"What models are available?"*
- *"Show me my recent chats"*
- *"Add user john@example.com to the 'Developers' group"*
- *"Export my system configuration"*

---

## 🔄 Why Was This Redeveloped?

The original [troylar/open-webui-mcp-server](https://github.com/troylar/open-webui-mcp-server) is an excellent Python-based MCP server. However, I needed something different for my use case:

### 1. **VPS-Only Hosting**

I wanted to host this MCP on my own VPS at `mcp.techmavie.digital` alongside my other MCP servers. The original was designed for local installation via `pip install` or `uvx`, which didn't fit my infrastructure.

### 2. **Consistency with Other MCPs**

I maintain several MCP servers (Malaysia Open Data, LTA DataMall, Ghost CMS, Malaysia Transit, etc.) all built with TypeScript/Node.js and deployed via Docker. Redeveloping in TypeScript ensures:

- **Same deployment pattern** — Docker, Nginx, GitHub Actions
- **Same monitoring** — Firebase analytics dashboard
- **Same maintenance** — One language, one toolchain

### 3. **Multi-Tenant Support**

The original uses environment variables for authentication. I needed URL-based credentials so multiple users can connect to the same server with their own Open WebUI instances — no server restart required.

### 4. **Streamable HTTP Transport**

Modern MCP clients (Claude Desktop, Cursor, Windsurf) work best with Streamable HTTP transport. This provides:

- **Remote access** — Connect from anywhere via HTTPS
- **Better reliability** — Proper session management
- **SSE support** — Real-time streaming responses

---

## 🔀 What's Changed from Original?

| Aspect | Original (troylar) | This Fork (hithereiamaliff) |
|--------|-------------------|----------------------------|
| **Language** | Python 3.12 | TypeScript (Node.js 20) |
| **Framework** | FastMCP + uvicorn | Express.js + MCP SDK |
| **Transport** | stdio / HTTP | Streamable HTTP only |
| **Installation** | `pip install` / `uvx` | Docker container |
| **Hosting** | Local machine | Self-hosted VPS |
| **Authentication** | Environment variables | URL query parameters |
| **Multi-Tenant** | ❌ Single instance | ✅ Multiple users/instances |
| **Deployment** | Manual | Auto via GitHub Actions |
| **Analytics** | None | Firebase + visual dashboard |
| **Health Check** | None | `/health` endpoint |

### Technical Differences

**Original Python Structure:**
```
src/openwebui_mcp/
├── main.py          # FastMCP server with tools
├── client.py        # Open WebUI API client
└── __init__.py
```

**New TypeScript Structure:**
```
src/
├── http-server.ts       # Express + MCP SDK server
├── openwebui-client.ts  # Open WebUI API client
└── firebase-analytics.ts # Analytics module
```

### Why TypeScript Instead of Python?

1. **Ecosystem** — Better MCP SDK support for Streamable HTTP
2. **Deployment** — Lighter Docker images with Node.js Alpine
3. **Consistency** — Matches my other MCP servers
4. **Performance** — Faster cold starts in containers

---

## ✨ Features

- **🌐 Remote Access** — Connect from any MCP client via HTTPS (not just local)
- **🔐 Multi-Tenant** — Each user provides their own Open WebUI credentials via URL
- **📊 60+ Tools** — Full management of users, groups, models, knowledge bases, chats, prompts, memories, tools, functions, and more
- **🔄 Auto-Deployment** — Push to GitHub, automatically deploys to VPS via GitHub Actions
- **📈 Analytics Dashboard** — Built-in usage tracking with Firebase integration
- **🐳 Docker Ready** — Production-ready Dockerfile with health checks
- **🔒 Secure** — Credentials passed per-request, never stored on server

---

## 🚀 Quick Start

### Add to Your MCP Client

Copy this configuration to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "openwebui": {
      "transport": "streamable-http",
      "url": "https://mcp.techmavie.digital/openwebui/mcp?url=YOUR_OPENWEBUI_URL&key=YOUR_API_KEY"
    }
  }
}
```

**Cursor/Windsurf** (MCP settings):
```json
{
  "openwebui": {
    "transport": "streamable-http",
    "url": "https://mcp.techmavie.digital/openwebui/mcp?url=YOUR_OPENWEBUI_URL&key=YOUR_API_KEY"
  }
}
```

### URL Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `url` | Yes | Your Open WebUI instance URL | `https://ai.example.com` |
| `key` | Yes | Your Open WebUI API key | `sk-abc123...` |

### Get Your API Key

1. Log in to your Open WebUI instance
2. Go to **Settings → Account**
3. Copy your API key

---

## 🛠️ Available Tools (60+)

### User Management
| Tool | Description | Permission |
|------|-------------|------------|
| `get_current_user` | Get authenticated user's profile | Any |
| `list_users` | List all users | Admin |
| `get_user` | Get specific user details | Admin |
| `update_user_role` | Change user role | Admin |
| `delete_user` | Delete a user | Admin |

### Group Management
| Tool | Description | Permission |
|------|-------------|------------|
| `list_groups` | List all groups | Any |
| `create_group` | Create a new group | Admin |
| `get_group` | Get group details | Any |
| `update_group` | Update group name/description | Admin |
| `add_user_to_group` | Add user to group | Admin |
| `remove_user_from_group` | Remove user from group | Admin |
| `delete_group` | Delete a group | Admin |

### Model Management
| Tool | Description | Permission |
|------|-------------|------------|
| `list_models` | List all models | Any |
| `get_model` | Get model configuration | Any |
| `create_model` | Create custom model | Admin |
| `update_model` | Update model settings | Admin |
| `delete_model` | Delete a model | Admin |

### Knowledge Base Management
| Tool | Description | Permission |
|------|-------------|------------|
| `list_knowledge_bases` | List knowledge bases | Any |
| `get_knowledge_base` | Get knowledge base details | Any |
| `create_knowledge_base` | Create knowledge base | Any |
| `update_knowledge_base` | Update knowledge base | Owner |
| `delete_knowledge_base` | Delete knowledge base | Owner |

### File Management
| Tool | Description | Permission |
|------|-------------|------------|
| `list_files` | List uploaded files | Any |
| `get_file` | Get file metadata | Any |
| `get_file_content` | Get extracted text content | Any |
| `update_file_content` | Update file content | Owner |
| `delete_file` | Delete a file | Owner |

### Chat Management
| Tool | Description | Permission |
|------|-------------|------------|
| `list_chats` | List user's chats | Own |
| `get_chat` | Get chat messages | Own |
| `delete_chat` | Delete a chat | Own |
| `delete_all_chats` | Delete all chats | Own |
| `archive_chat` | Archive a chat | Own |
| `share_chat` | Share a chat publicly | Own |
| `clone_chat` | Clone a shared chat | Any |

### Prompt Management
| Tool | Description | Permission |
|------|-------------|------------|
| `list_prompts` | List prompt templates | Any |
| `get_prompt` | Get prompt by command | Any |
| `create_prompt` | Create prompt template | Any |
| `update_prompt` | Update prompt | Owner |
| `delete_prompt` | Delete prompt | Owner |

### Memory Management
| Tool | Description | Permission |
|------|-------------|------------|
| `list_memories` | List stored memories | Own |
| `add_memory` | Add a new memory | Own |
| `query_memories` | Semantic search memories | Own |
| `update_memory` | Update a memory | Own |
| `delete_memory` | Delete a memory | Own |
| `delete_all_memories` | Delete all memories | Own |

### Tool & Function Management
| Tool | Description | Permission |
|------|-------------|------------|
| `list_tools` | List available tools | Any |
| `create_tool` | Create custom tool | Admin |
| `list_functions` | List functions/filters | Any |
| `create_function` | Create function | Admin |
| `toggle_function` | Enable/disable function | Admin |

### Notes & Channels
| Tool | Description | Permission |
|------|-------------|------------|
| `list_notes` | List notes | Own |
| `create_note` | Create a note | Own |
| `list_channels` | List team channels | Any |
| `post_channel_message` | Post to channel | Any |

### System (Admin)
| Tool | Description | Permission |
|------|-------------|------------|
| `get_system_config` | Get system config | Admin |
| `export_config` | Export full config | Admin |
| `get_banners` | Get notification banners | Any |
| `get_models_config` | Get models config | Admin |
| `get_tool_servers` | Get MCP/OpenAPI servers | Admin |

---

## 🖥️ API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server information |
| `/health` | GET | Health check |
| `/mcp` | POST | MCP protocol endpoint |
| `/analytics` | GET | Analytics JSON data |
| `/analytics/dashboard` | GET | Visual analytics dashboard |

---

## 🏠 Self-Hosting Guide

### Prerequisites

- VPS with Docker & Docker Compose
- Nginx with SSL (Let's Encrypt)
- Domain pointing to VPS (e.g., `mcp.yourdomain.com`)

### Deployment Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Container build configuration |
| `docker-compose.yml` | Docker orchestration |
| `deploy/nginx-mcp.conf` | Nginx reverse proxy config |
| `.github/workflows/deploy-vps.yml` | Auto-deployment workflow |

### Quick Deploy

```bash
# On your VPS
mkdir -p /opt/mcp-servers/mcp-openwebui
cd /opt/mcp-servers/mcp-openwebui
git clone https://github.com/hithereiamaliff/mcp-openwebui.git .

# Build and start
docker compose up -d --build

# Check logs
docker compose logs -f
```

### Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/mcp.techmavie.digital
# Add the location block from deploy/nginx-mcp.conf
sudo nginx -t
sudo systemctl reload nginx
```

### GitHub Secrets (for auto-deployment)

Set these in your repository settings:

- `VPS_HOST` — Your VPS IP address
- `VPS_USERNAME` — SSH username
- `VPS_SSH_KEY` — Private SSH key
- `VPS_PORT` — SSH port (usually 22)

---

## 🔧 Troubleshooting

### "Missing url or key parameter"

**Problem:** You're getting an error about missing credentials.

**Solution:** Make sure your URL includes both `url` and `key` parameters:
```
https://mcp.techmavie.digital/openwebui/mcp?url=YOUR_OPENWEBUI_URL&key=YOUR_API_KEY
```

### "Invalid API key" or "Unauthorized"

**Problem:** Your Open WebUI API key is incorrect or expired.

**Solution:**
1. Log in to your Open WebUI instance
2. Go to **Settings → Account**
3. Generate a new API key
4. Update your MCP client configuration

### "Connection refused" or "502 Bad Gateway"

**Problem:** The MCP server is not running or Nginx is misconfigured.

**Solution (for self-hosters):**
```bash
# Check if container is running
docker ps | grep mcp-openwebui

# Check container logs
docker compose logs -f

# Restart the container
docker compose down && docker compose up -d --build
```

### "ECONNREFUSED" to Open WebUI

**Problem:** The MCP server can't reach your Open WebUI instance.

**Solution:**
1. Make sure your Open WebUI URL is accessible from the internet
2. Check if your Open WebUI has CORS enabled
3. Verify the URL doesn't have a trailing slash

### Tools Not Showing Up

**Problem:** Claude/Cursor doesn't show the Open WebUI tools.

**Solution:**
1. Restart your MCP client (Claude Desktop, Cursor, etc.)
2. Check the MCP client logs for connection errors
3. Verify the URL is correct in your config

---

## 📊 Analytics Dashboard

This MCP includes a built-in analytics dashboard to track usage:

- **View Dashboard:** `https://mcp.techmavie.digital/openwebui/analytics/dashboard`
- **Raw JSON Data:** `https://mcp.techmavie.digital/openwebui/analytics`

The dashboard shows:
- Total requests and tool calls
- Most popular tools
- Requests by hour
- Client information

Analytics are stored in Firebase Realtime Database with local file backup.

---

## 🤝 Contributing

Contributions are welcome! If you'd like to add features or fix bugs:

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Clone the repo
git clone https://github.com/hithereiamaliff/mcp-openwebui.git
cd mcp-openwebui

# Install dependencies
npm install

# Build TypeScript
npm run build:tsc

# Run locally (for development)
npm run dev:http
```

---

## 📄 License

MIT License — See [LICENSE](LICENSE) file for details.

---

## 🙏 Credits

- **Original MCP Server:** [@troylar](https://github.com/troylar/open-webui-mcp-server) — The Python-based MCP that inspired this redevelopment
- **Redeveloped by:** [@hithereiamaliff](https://github.com/hithereiamaliff) — TypeScript rewrite with VPS deployment
- **Open WebUI:** [open-webui.com](https://openwebui.com/) — The amazing self-hosted AI interface
- **MCP Protocol:** [modelcontextprotocol.io](https://modelcontextprotocol.io/) — The open standard making this possible

---

## 📬 Support

- **Issues:** [GitHub Issues](https://github.com/hithereiamaliff/mcp-openwebui/issues)
- **Discussions:** [GitHub Discussions](https://github.com/hithereiamaliff/mcp-openwebui/discussions)

---

*Made with ❤️ in Malaysia*
