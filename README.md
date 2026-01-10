# Open WebUI MCP Server

> 🤖 **Manage your Open WebUI instance through AI assistants** — users, groups, models, knowledge bases, chats, and more!

[![Fork](https://img.shields.io/badge/Fork%20of-troylar%2Fopen--webui--mcp--server-blue)](https://github.com/troylar/open-webui-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

This is an enhanced fork of [troylar/open-webui-mcp-server](https://github.com/troylar/open-webui-mcp-server), rebuilt for **self-hosted VPS deployment** with **Streamable HTTP transport**.

---

## ✨ Features

- **🌐 Remote Access** — Connect from any MCP client via HTTPS
- **🔐 Multi-Tenant** — Each user provides their own Open WebUI credentials via URL
- **📊 60+ Tools** — Full management of users, groups, models, knowledge bases, chats, prompts, memories, tools, functions, and more
- **🔄 Auto-Deployment** — Push to GitHub, automatically deploys to VPS
- **📈 Analytics Dashboard** — Built-in usage tracking with Firebase integration

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

## 🔄 What's Changed from Original

| Aspect | Original | This Fork |
|--------|----------|-----------|
| **Language** | Python (FastMCP) | TypeScript (Node.js) |
| **Transport** | stdio / HTTP (uvicorn) | Streamable HTTP (Express) |
| **Hosting** | Local / pip install | Self-hosted VPS |
| **Auth** | Environment variable | URL query parameters |
| **Deployment** | Manual | Auto via GitHub Actions |
| **Analytics** | None | Firebase + Dashboard |

---

## 📄 License

MIT License — See [LICENSE](LICENSE) file for details.

---

## 🙏 Credits

- Original MCP server by [@troylar](https://github.com/troylar/open-webui-mcp-server)
- Enhanced by [@hithereiamaliff](https://github.com/hithereiamaliff)
