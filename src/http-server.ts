#!/usr/bin/env node

/**
 * Open WebUI MCP Server - HTTP Server Entry Point
 * For self-hosting on VPS with nginx reverse proxy
 * Uses Streamable HTTP transport
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { OpenWebUIClient } from './openwebui-client.js';
import { FirebaseAnalytics, Analytics } from './firebase-analytics.js';

// Configuration
const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';
const ANALYTICS_DATA_DIR = process.env.ANALYTICS_DIR || '/app/data';
const ANALYTICS_FILE = path.join(ANALYTICS_DATA_DIR, 'analytics.json');
const SAVE_INTERVAL_MS = 60000;
const MAX_RECENT_CALLS = 100;

// Initialize analytics
let analytics: Analytics = {
  serverStartTime: new Date().toISOString(),
  totalRequests: 0,
  totalToolCalls: 0,
  requestsByMethod: {},
  requestsByEndpoint: {},
  toolCalls: {},
  recentToolCalls: [],
  clientsByIp: {},
  clientsByUserAgent: {},
  hourlyRequests: {},
};

// Ensure data directory exists
function ensureDataDir(): void {
  if (!fs.existsSync(ANALYTICS_DATA_DIR)) {
    fs.mkdirSync(ANALYTICS_DATA_DIR, { recursive: true });
    console.log(`📁 Created analytics data directory: ${ANALYTICS_DATA_DIR}`);
  }
}

// Load analytics from disk
function loadAnalytics(): void {
  try {
    ensureDataDir();
    if (fs.existsSync(ANALYTICS_FILE)) {
      const data = fs.readFileSync(ANALYTICS_FILE, 'utf-8');
      const loaded = JSON.parse(data) as Analytics;
      analytics = {
        ...loaded,
        serverStartTime: loaded.serverStartTime || new Date().toISOString(),
        requestsByMethod: loaded.requestsByMethod || {},
        requestsByEndpoint: loaded.requestsByEndpoint || {},
        toolCalls: loaded.toolCalls || {},
        recentToolCalls: loaded.recentToolCalls || [],
        clientsByIp: loaded.clientsByIp || {},
        clientsByUserAgent: loaded.clientsByUserAgent || {},
        hourlyRequests: loaded.hourlyRequests || {},
      };
      console.log(`📊 Loaded analytics from ${ANALYTICS_FILE}`);
      console.log(`   Total requests: ${analytics.totalRequests}`);
    } else {
      console.log(`📊 No existing analytics file, starting fresh`);
    }
  } catch (error) {
    console.error(`⚠️ Failed to load analytics:`, error);
  }
}

// Save analytics to disk
function saveAnalytics(): void {
  try {
    ensureDataDir();
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(analytics, null, 2));
    console.log(`💾 Saved analytics to ${ANALYTICS_FILE}`);
  } catch (error) {
    console.error(`⚠️ Failed to save analytics:`, error);
  }
}

// Track HTTP request
function trackRequest(req: Request, endpoint: string): void {
  analytics.totalRequests++;
  
  const method = req.method;
  analytics.requestsByMethod[method] = (analytics.requestsByMethod[method] || 0) + 1;
  analytics.requestsByEndpoint[endpoint] = (analytics.requestsByEndpoint[endpoint] || 0) + 1;
  
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  analytics.clientsByIp[clientIp] = (analytics.clientsByIp[clientIp] || 0) + 1;
  
  const userAgent = req.headers['user-agent'] || 'unknown';
  const shortAgent = userAgent.substring(0, 50);
  analytics.clientsByUserAgent[shortAgent] = (analytics.clientsByUserAgent[shortAgent] || 0) + 1;
  
  const hour = new Date().toISOString().substring(0, 13);
  analytics.hourlyRequests[hour] = (analytics.hourlyRequests[hour] || 0) + 1;
}

// Track tool call
function trackToolCall(toolName: string, req: Request): void {
  analytics.totalToolCalls++;
  analytics.toolCalls[toolName] = (analytics.toolCalls[toolName] || 0) + 1;
  
  const toolCall = {
    tool: toolName,
    timestamp: new Date().toISOString(),
    clientIp: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown',
    userAgent: (req.headers['user-agent'] || 'unknown').substring(0, 50),
  };
  
  analytics.recentToolCalls.unshift(toolCall);
  if (analytics.recentToolCalls.length > MAX_RECENT_CALLS) {
    analytics.recentToolCalls.pop();
  }
}

// Calculate uptime
function getUptime(): string {
  const start = new Date(analytics.serverStartTime).getTime();
  const now = Date.now();
  const diff = now - start;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Initialize Firebase Analytics
const firebaseAnalytics = new FirebaseAnalytics('mcp-openwebui');

// Load analytics on startup
async function initializeAnalytics() {
  if (firebaseAnalytics.isInitialized()) {
    const firebaseData = await firebaseAnalytics.loadAnalytics();
    if (firebaseData) {
      analytics = firebaseData;
      console.log('📊 Loaded analytics from Firebase');
      return;
    }
  }
  loadAnalytics();
}

initializeAnalytics();

// Periodic save
const saveInterval = setInterval(async () => {
  saveAnalytics();
  if (firebaseAnalytics.isInitialized()) {
    await firebaseAnalytics.saveAnalytics(analytics);
  }
}, SAVE_INTERVAL_MS);

// Create MCP server with Open WebUI tools
function createMcpServer(openwebuiUrl: string, apiKey: string) {
  const client = new OpenWebUIClient({ url: openwebuiUrl, apiKey });
  
  console.log(`[openwebui-mcp] Using Open WebUI: url=${openwebuiUrl}`);

  const server = new McpServer({
    name: 'openwebui-mcp-server',
    version: '1.0.0',
  });

  // ==========================================================================
  // User Management Tools
  // ==========================================================================

  server.tool('get_current_user', 'Get the currently authenticated user profile', {}, async () => {
    const result = await client.getCurrentUser();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('list_users', 'List all users (ADMIN ONLY)', {}, async () => {
    const result = await client.listUsers();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('get_user', 'Get a specific user by ID (ADMIN ONLY)', {
    user_id: z.string().describe('User ID'),
  }, async (args) => {
    const result = await client.getUser(args.user_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('update_user_role', 'Update a user role (ADMIN ONLY)', {
    user_id: z.string().describe('User ID'),
    role: z.string().describe('New role: admin, user, or pending'),
  }, async (args) => {
    const result = await client.updateUserRole(args.user_id, args.role);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('delete_user', 'Delete a user (ADMIN ONLY)', {
    user_id: z.string().describe('User ID'),
  }, async (args) => {
    const result = await client.deleteUser(args.user_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  // ==========================================================================
  // Group Management Tools
  // ==========================================================================

  server.tool('list_groups', 'List all groups', {}, async () => {
    const result = await client.listGroups();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('create_group', 'Create a new group (ADMIN ONLY)', {
    name: z.string().describe('Group name'),
    description: z.string().optional().describe('Group description'),
  }, async (args) => {
    const result = await client.createGroup(args.name, args.description || '');
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('get_group', 'Get group details', {
    group_id: z.string().describe('Group ID'),
  }, async (args) => {
    const result = await client.getGroup(args.group_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('update_group', 'Update a group (ADMIN ONLY)', {
    group_id: z.string().describe('Group ID'),
    name: z.string().optional().describe('New group name'),
    description: z.string().optional().describe('New group description'),
  }, async (args) => {
    const result = await client.updateGroup(args.group_id, args.name, args.description);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('add_user_to_group', 'Add a user to a group (ADMIN ONLY)', {
    group_id: z.string().describe('Group ID'),
    user_id: z.string().describe('User ID'),
  }, async (args) => {
    const result = await client.addUserToGroup(args.group_id, args.user_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('remove_user_from_group', 'Remove a user from a group (ADMIN ONLY)', {
    group_id: z.string().describe('Group ID'),
    user_id: z.string().describe('User ID'),
  }, async (args) => {
    const result = await client.removeUserFromGroup(args.group_id, args.user_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('delete_group', 'Delete a group (ADMIN ONLY)', {
    group_id: z.string().describe('Group ID'),
  }, async (args) => {
    const result = await client.deleteGroup(args.group_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  // ==========================================================================
  // Model Management Tools
  // ==========================================================================

  server.tool('list_models', 'List all available models', {}, async () => {
    const result = await client.listModels();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('get_model', 'Get model details', {
    model_id: z.string().describe('Model ID'),
  }, async (args) => {
    const result = await client.getModel(args.model_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('create_model', 'Create a custom model (ADMIN ONLY)', {
    id: z.string().describe('Model ID (slug-format)'),
    name: z.string().describe('Display name'),
    base_model_id: z.string().describe('Base model ID'),
    system_prompt: z.string().optional().describe('System prompt'),
    temperature: z.number().optional().describe('Temperature (0.0-2.0)'),
    max_tokens: z.number().optional().describe('Max tokens'),
  }, async (args) => {
    const meta = args.system_prompt ? { system: args.system_prompt } : undefined;
    const params: Record<string, unknown> = {};
    if (args.temperature !== undefined) params.temperature = args.temperature;
    if (args.max_tokens !== undefined) params.max_tokens = args.max_tokens;
    const result = await client.createModel(args.id, args.name, args.base_model_id, meta, Object.keys(params).length > 0 ? params : undefined);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('update_model', 'Update a model', {
    model_id: z.string().describe('Model ID'),
    name: z.string().optional().describe('New display name'),
    system_prompt: z.string().optional().describe('New system prompt'),
    temperature: z.number().optional().describe('New temperature'),
    max_tokens: z.number().optional().describe('New max tokens'),
  }, async (args) => {
    const meta = args.system_prompt !== undefined ? { system: args.system_prompt } : undefined;
    const params: Record<string, unknown> = {};
    if (args.temperature !== undefined) params.temperature = args.temperature;
    if (args.max_tokens !== undefined) params.max_tokens = args.max_tokens;
    const result = await client.updateModel(args.model_id, args.name, meta, Object.keys(params).length > 0 ? params : undefined);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('delete_model', 'Delete a model (ADMIN ONLY)', {
    model_id: z.string().describe('Model ID'),
  }, async (args) => {
    const result = await client.deleteModel(args.model_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  // ==========================================================================
  // Knowledge Base Management Tools
  // ==========================================================================

  server.tool('list_knowledge_bases', 'List all knowledge bases', {}, async () => {
    const result = await client.listKnowledge();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('get_knowledge_base', 'Get knowledge base details', {
    knowledge_id: z.string().describe('Knowledge base ID'),
  }, async (args) => {
    const result = await client.getKnowledge(args.knowledge_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('create_knowledge_base', 'Create a new knowledge base', {
    name: z.string().describe('Knowledge base name'),
    description: z.string().optional().describe('Description'),
  }, async (args) => {
    const result = await client.createKnowledge(args.name, args.description || '');
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('update_knowledge_base', 'Update a knowledge base', {
    knowledge_id: z.string().describe('Knowledge base ID'),
    name: z.string().optional().describe('New name'),
    description: z.string().optional().describe('New description'),
  }, async (args) => {
    const result = await client.updateKnowledge(args.knowledge_id, args.name, args.description);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('delete_knowledge_base', 'Delete a knowledge base', {
    knowledge_id: z.string().describe('Knowledge base ID'),
  }, async (args) => {
    const result = await client.deleteKnowledge(args.knowledge_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  // ==========================================================================
  // File Management Tools
  // ==========================================================================

  server.tool('list_files', 'List all uploaded files', {}, async () => {
    const result = await client.listFiles();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('get_file', 'Get file metadata', {
    file_id: z.string().describe('File ID'),
  }, async (args) => {
    const result = await client.getFile(args.file_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('get_file_content', 'Get extracted text content from a file', {
    file_id: z.string().describe('File ID'),
  }, async (args) => {
    const result = await client.getFileContent(args.file_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('update_file_content', 'Update file extracted content', {
    file_id: z.string().describe('File ID'),
    content: z.string().describe('New text content'),
  }, async (args) => {
    const result = await client.updateFileContent(args.file_id, args.content);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('delete_file', 'Delete a file', {
    file_id: z.string().describe('File ID'),
  }, async (args) => {
    const result = await client.deleteFile(args.file_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  // ==========================================================================
  // Chat Management Tools
  // ==========================================================================

  server.tool('list_chats', 'List your chats', {}, async () => {
    const result = await client.listChats();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('get_chat', 'Get chat details and messages', {
    chat_id: z.string().describe('Chat ID'),
  }, async (args) => {
    const result = await client.getChat(args.chat_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('delete_chat', 'Delete a chat', {
    chat_id: z.string().describe('Chat ID'),
  }, async (args) => {
    const result = await client.deleteChat(args.chat_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('delete_all_chats', 'Delete all your chats (WARNING: Cannot be undone)', {}, async () => {
    const result = await client.deleteAllChats();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('archive_chat', 'Archive a chat', {
    chat_id: z.string().describe('Chat ID'),
  }, async (args) => {
    const result = await client.archiveChat(args.chat_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('share_chat', 'Share a chat (make it publicly accessible)', {
    chat_id: z.string().describe('Chat ID'),
  }, async (args) => {
    const result = await client.shareChat(args.chat_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('clone_chat', 'Clone a shared chat to your account', {
    chat_id: z.string().describe('Chat ID'),
  }, async (args) => {
    const result = await client.cloneChat(args.chat_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  // ==========================================================================
  // Prompt Management Tools
  // ==========================================================================

  server.tool('list_prompts', 'List all prompt templates', {}, async () => {
    const result = await client.listPrompts();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('get_prompt', 'Get a prompt template by command', {
    command: z.string().describe('Command (without leading slash)'),
  }, async (args) => {
    const result = await client.getPrompt(args.command);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('create_prompt', 'Create a new prompt template', {
    command: z.string().describe('Command trigger (e.g., /summarize)'),
    title: z.string().describe('Prompt title'),
    content: z.string().describe('Prompt template content'),
  }, async (args) => {
    const result = await client.createPrompt(args.command, args.title, args.content);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('update_prompt', 'Update a prompt template', {
    command: z.string().describe('Command (without leading slash)'),
    title: z.string().optional().describe('New title'),
    content: z.string().optional().describe('New content'),
  }, async (args) => {
    const result = await client.updatePrompt(args.command, args.title, args.content);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('delete_prompt', 'Delete a prompt template', {
    command: z.string().describe('Command (without leading slash)'),
  }, async (args) => {
    const result = await client.deletePrompt(args.command);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  // ==========================================================================
  // Memory Management Tools
  // ==========================================================================

  server.tool('list_memories', 'List all your stored memories', {}, async () => {
    const result = await client.listMemories();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('add_memory', 'Add a new memory', {
    content: z.string().describe('Memory content to store'),
  }, async (args) => {
    const result = await client.addMemory(args.content);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('query_memories', 'Search memories using semantic similarity', {
    content: z.string().describe('Query text for semantic search'),
    k: z.number().optional().describe('Number of results to return (default: 5)'),
  }, async (args) => {
    const result = await client.queryMemories(args.content, args.k || 5);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('update_memory', 'Update an existing memory', {
    memory_id: z.string().describe('Memory ID'),
    content: z.string().describe('New content'),
  }, async (args) => {
    const result = await client.updateMemory(args.memory_id, args.content);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('delete_memory', 'Delete a specific memory', {
    memory_id: z.string().describe('Memory ID'),
  }, async (args) => {
    const result = await client.deleteMemory(args.memory_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('delete_all_memories', 'Delete all your memories (WARNING: Cannot be undone)', {}, async () => {
    const result = await client.deleteAllMemories();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  // ==========================================================================
  // Tool Management Tools
  // ==========================================================================

  server.tool('list_tools', 'List all available tools', {}, async () => {
    const result = await client.listTools();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('get_tool', 'Get tool details', {
    tool_id: z.string().describe('Tool ID'),
  }, async (args) => {
    const result = await client.getTool(args.tool_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('create_tool', 'Create a new custom tool', {
    id: z.string().describe('Tool ID (slug-format)'),
    name: z.string().describe('Tool name'),
    content: z.string().describe('Tool Python code'),
  }, async (args) => {
    const result = await client.createTool(args.id, args.name, args.content);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('update_tool', 'Update a tool', {
    tool_id: z.string().describe('Tool ID'),
    name: z.string().optional().describe('New name'),
    content: z.string().optional().describe('New code'),
  }, async (args) => {
    const result = await client.updateTool(args.tool_id, args.name, args.content);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('delete_tool', 'Delete a tool', {
    tool_id: z.string().describe('Tool ID'),
  }, async (args) => {
    const result = await client.deleteTool(args.tool_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  // ==========================================================================
  // Function Management Tools
  // ==========================================================================

  server.tool('list_functions', 'List all functions (filters and pipes)', {}, async () => {
    const result = await client.listFunctions();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('get_function', 'Get function details', {
    function_id: z.string().describe('Function ID'),
  }, async (args) => {
    const result = await client.getFunction(args.function_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('create_function', 'Create a new function (filter or pipe)', {
    id: z.string().describe('Function ID (slug-format)'),
    name: z.string().describe('Function name'),
    type: z.string().describe('Type: filter or pipe'),
    content: z.string().describe('Function Python code'),
  }, async (args) => {
    const result = await client.createFunction(args.id, args.name, args.type, args.content);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('update_function', 'Update a function', {
    function_id: z.string().describe('Function ID'),
    name: z.string().optional().describe('New name'),
    content: z.string().optional().describe('New code'),
  }, async (args) => {
    const result = await client.updateFunction(args.function_id, args.name, args.content);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('toggle_function', 'Toggle a function enabled/disabled state', {
    function_id: z.string().describe('Function ID'),
  }, async (args) => {
    const result = await client.toggleFunction(args.function_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('delete_function', 'Delete a function', {
    function_id: z.string().describe('Function ID'),
  }, async (args) => {
    const result = await client.deleteFunction(args.function_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  // ==========================================================================
  // Folder Management Tools
  // ==========================================================================

  server.tool('list_folders', 'List all folders for organizing chats', {}, async () => {
    const result = await client.listFolders();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('create_folder', 'Create a new folder', {
    name: z.string().describe('Folder name'),
  }, async (args) => {
    const result = await client.createFolder(args.name);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('get_folder', 'Get folder details', {
    folder_id: z.string().describe('Folder ID'),
  }, async (args) => {
    const result = await client.getFolder(args.folder_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('update_folder', 'Rename a folder', {
    folder_id: z.string().describe('Folder ID'),
    name: z.string().describe('New folder name'),
  }, async (args) => {
    const result = await client.updateFolder(args.folder_id, args.name);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('delete_folder', 'Delete a folder', {
    folder_id: z.string().describe('Folder ID'),
  }, async (args) => {
    const result = await client.deleteFolder(args.folder_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  // ==========================================================================
  // Notes Management Tools
  // ==========================================================================

  server.tool('list_notes', 'List all your notes', {}, async () => {
    const result = await client.listNotes();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('create_note', 'Create a new note', {
    title: z.string().describe('Note title'),
    content: z.string().describe('Note content (markdown supported)'),
  }, async (args) => {
    const result = await client.createNote(args.title, args.content);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('get_note', 'Get a specific note', {
    note_id: z.string().describe('Note ID'),
  }, async (args) => {
    const result = await client.getNote(args.note_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('update_note', 'Update a note', {
    note_id: z.string().describe('Note ID'),
    title: z.string().optional().describe('New title'),
    content: z.string().optional().describe('New content'),
  }, async (args) => {
    const result = await client.updateNote(args.note_id, args.title, args.content);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('delete_note', 'Delete a note', {
    note_id: z.string().describe('Note ID'),
  }, async (args) => {
    const result = await client.deleteNote(args.note_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  // ==========================================================================
  // Channels (Team Chat) Management Tools
  // ==========================================================================

  server.tool('list_channels', 'List all team chat channels', {}, async () => {
    const result = await client.listChannels();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('create_channel', 'Create a new team chat channel', {
    name: z.string().describe('Channel name'),
    description: z.string().optional().describe('Channel description'),
  }, async (args) => {
    const result = await client.createChannel(args.name, args.description || '');
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('get_channel', 'Get channel details', {
    channel_id: z.string().describe('Channel ID'),
  }, async (args) => {
    const result = await client.getChannel(args.channel_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('update_channel', 'Update a channel', {
    channel_id: z.string().describe('Channel ID'),
    name: z.string().optional().describe('New channel name'),
    description: z.string().optional().describe('New description'),
  }, async (args) => {
    const result = await client.updateChannel(args.channel_id, args.name, args.description);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('delete_channel', 'Delete a channel and all its messages', {
    channel_id: z.string().describe('Channel ID'),
  }, async (args) => {
    const result = await client.deleteChannel(args.channel_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('get_channel_messages', 'Get messages from a channel', {
    channel_id: z.string().describe('Channel ID'),
    skip: z.number().optional().describe('Number of messages to skip (default: 0)'),
    limit: z.number().optional().describe('Max messages to return (default: 50)'),
  }, async (args) => {
    const result = await client.getChannelMessages(args.channel_id, args.skip || 0, args.limit || 50);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('post_channel_message', 'Post a message to a channel', {
    channel_id: z.string().describe('Channel ID'),
    content: z.string().describe('Message content'),
    parent_id: z.string().optional().describe('Parent message ID for threading'),
  }, async (args) => {
    const result = await client.postChannelMessage(args.channel_id, args.content, args.parent_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('delete_channel_message', 'Delete a message from a channel', {
    channel_id: z.string().describe('Channel ID'),
    message_id: z.string().describe('Message ID'),
  }, async (args) => {
    const result = await client.deleteChannelMessage(args.channel_id, args.message_id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  // ==========================================================================
  // Config/Settings Tools (Admin)
  // ==========================================================================

  server.tool('get_system_config', 'Get system configuration (ADMIN ONLY)', {}, async () => {
    const result = await client.getConfig();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('export_config', 'Export full system configuration (ADMIN ONLY)', {}, async () => {
    const result = await client.exportConfig();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('get_banners', 'Get system notification banners', {}, async () => {
    const result = await client.getBanners();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('get_models_config', 'Get default models configuration (ADMIN ONLY)', {}, async () => {
    const result = await client.getModelsConfig();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('get_tool_servers', 'Get tool server (MCP/OpenAPI) connections (ADMIN ONLY)', {}, async () => {
    const result = await client.getToolServers();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  return server;
}

// Create Express app
const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Accept'],
  credentials: false,
}));

app.options('*', cors());

// Store MCP servers per credentials
const mcpServers = new Map<string, McpServer>();

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  trackRequest(req, '/health');
  res.json({
    status: 'healthy',
    server: 'Open WebUI MCP Server',
    version: '1.0.0',
    transport: 'streamable-http',
    uptime: getUptime(),
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  trackRequest(req, '/');
  res.json({
    name: 'Open WebUI MCP Server',
    version: '1.0.0',
    description: 'MCP server for managing Open WebUI - users, groups, models, knowledge bases, chats, and more',
    endpoints: {
      health: '/health',
      mcp: '/mcp?url=YOUR_OPENWEBUI_URL&key=YOUR_API_KEY',
      analytics: '/analytics',
      dashboard: '/analytics/dashboard',
    },
    documentation: 'https://github.com/hithereiamaliff/mcp-openwebui',
  });
});

// Analytics endpoint
app.get('/analytics', (req: Request, res: Response) => {
  trackRequest(req, '/analytics');
  res.json({
    ...analytics,
    uptime: getUptime(),
  });
});

// Analytics dashboard
app.get('/analytics/dashboard', (req: Request, res: Response) => {
  trackRequest(req, '/analytics/dashboard');
  
  const dashboardHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Open WebUI MCP - Analytics Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { font-size: 1.8rem; margin-bottom: 20px; color: #f8fafc; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 20px; }
    .card { background: #1e293b; border-radius: 12px; padding: 20px; }
    .card h3 { font-size: 0.875rem; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    .card .value { font-size: 2rem; font-weight: 700; color: #f8fafc; }
    .card .subtitle { font-size: 0.75rem; color: #64748b; margin-top: 4px; }
    .chart-card { background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .chart-card h3 { font-size: 1rem; color: #f8fafc; margin-bottom: 15px; }
    .chart-container { height: 250px; }
    .activity-list { max-height: 300px; overflow-y: auto; }
    .activity-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #334155; }
    .activity-item:last-child { border-bottom: none; }
    .activity-tool { font-weight: 600; color: #3b82f6; }
    .activity-time { font-size: 0.75rem; color: #64748b; }
    .activity-ip { font-size: 0.7rem; color: #475569; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Open WebUI MCP - Analytics Dashboard</h1>
    <div class="grid">
      <div class="card">
        <h3>Total Requests</h3>
        <div class="value" id="totalRequests">-</div>
        <div class="subtitle" id="startTime">-</div>
      </div>
      <div class="card">
        <h3>Tool Calls</h3>
        <div class="value" id="totalToolCalls">-</div>
        <div class="subtitle" id="uniqueTools">-</div>
      </div>
      <div class="card">
        <h3>Uptime</h3>
        <div class="value" id="uptime">-</div>
        <div class="subtitle" id="requestsPerHour">-</div>
      </div>
      <div class="card">
        <h3>Unique Clients</h3>
        <div class="value" id="uniqueClients">-</div>
        <div class="subtitle" id="topClient">-</div>
      </div>
    </div>
    <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));">
      <div class="chart-card">
        <h3>Tool Usage</h3>
        <div class="chart-container"><canvas id="toolsChart"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>Hourly Requests (Last 24h)</h3>
        <div class="chart-container"><canvas id="hourlyChart"></canvas></div>
      </div>
    </div>
    <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));">
      <div class="chart-card">
        <h3>Requests by Endpoint</h3>
        <div class="chart-container"><canvas id="endpointChart"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>Recent Activity</h3>
        <div class="activity-list" id="activityList"><div class="loading">Loading...</div></div>
      </div>
    </div>
  </div>
  <script>
    let toolsChart, hourlyChart, endpointChart;
    const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    
    async function loadData() {
      try {
        const basePath = window.location.pathname.replace(/\\/analytics\\/dashboard\\/?$/, '');
        const res = await fetch(basePath + '/analytics');
        const data = await res.json();
        updateDashboard(data);
      } catch (err) { console.error('Failed to load analytics:', err); }
    }
    
    function updateDashboard(data) {
      document.getElementById('totalRequests').textContent = data.totalRequests.toLocaleString();
      document.getElementById('totalToolCalls').textContent = data.totalToolCalls.toLocaleString();
      document.getElementById('uptime').textContent = data.uptime;
      document.getElementById('startTime').textContent = 'Started: ' + new Date(data.serverStartTime).toLocaleString();
      document.getElementById('uniqueTools').textContent = Object.keys(data.toolCalls || {}).length + ' unique tools';
      document.getElementById('uniqueClients').textContent = Object.keys(data.clientsByIp || {}).length;
      const hourlyValues = Object.values(data.hourlyRequests || {});
      const avgPerHour = hourlyValues.length > 0 ? Math.round(hourlyValues.reduce((a, b) => a + b, 0) / hourlyValues.length) : 0;
      document.getElementById('requestsPerHour').textContent = avgPerHour + ' avg req/hour';
      const topClient = Object.entries(data.clientsByUserAgent || {}).sort((a, b) => b[1] - a[1])[0];
      document.getElementById('topClient').textContent = topClient ? 'Top: ' + topClient[0].substring(0, 20) : 'Top: -';
      updateToolsChart(data.toolCalls || {});
      updateHourlyChart(data.hourlyRequests || {});
      updateEndpointChart(data.requestsByEndpoint || {});
      updateActivityList(data.recentToolCalls || []);
    }
    
    function updateToolsChart(toolCalls) {
      const ctx = document.getElementById('toolsChart').getContext('2d');
      const sorted = Object.entries(toolCalls).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const labels = sorted.map(([k]) => k);
      const values = sorted.map(([, v]) => v);
      if (toolsChart) toolsChart.destroy();
      toolsChart = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: 'Calls', data: values, backgroundColor: chartColors }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8', maxRotation: 45 } } } } });
    }
    
    function updateHourlyChart(hourlyRequests) {
      const ctx = document.getElementById('hourlyChart').getContext('2d');
      const sorted = Object.entries(hourlyRequests).sort((a, b) => a[0].localeCompare(b[0])).slice(-24);
      const labels = sorted.map(([h]) => h.substring(11) + ':00');
      const values = sorted.map(([, v]) => v);
      if (hourlyChart) hourlyChart.destroy();
      hourlyChart = new Chart(ctx, { type: 'line', data: { labels, datasets: [{ label: 'Requests', data: values, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.3 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } } } });
    }
    
    function updateEndpointChart(endpoints) {
      const ctx = document.getElementById('endpointChart').getContext('2d');
      const sorted = Object.entries(endpoints).sort((a, b) => b[1] - a[1]).slice(0, 8);
      const labels = sorted.map(([e]) => e);
      const values = sorted.map(([, v]) => v);
      if (endpointChart) endpointChart.destroy();
      endpointChart = new Chart(ctx, { type: 'doughnut', data: { labels, datasets: [{ data: values, backgroundColor: chartColors }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94a3b8', boxWidth: 12 } } } } });
    }
    
    function updateActivityList(recentCalls) {
      const list = document.getElementById('activityList');
      if (recentCalls.length === 0) { list.innerHTML = '<div style="color:#64748b;text-align:center;padding:20px;">No recent tool calls</div>'; return; }
      list.innerHTML = recentCalls.slice(0, 15).map(call => '<div class="activity-item"><div><span class="activity-tool">' + call.tool + '</span><div class="activity-ip">' + call.clientIp + '</div></div><span class="activity-time">' + new Date(call.timestamp).toLocaleString() + '</span></div>').join('');
    }
    
    loadData();
    setInterval(loadData, 30000);
  </script>
</body>
</html>`;
  
  res.type('html').send(dashboardHtml);
});

// MCP endpoint
app.all('/mcp', async (req: Request, res: Response) => {
  const acceptHeader = req.headers['accept'] || '';
  if (!acceptHeader.includes('text/event-stream')) {
    req.headers['accept'] = acceptHeader ? `${acceptHeader}, text/event-stream` : 'text/event-stream';
  }
  trackRequest(req, '/mcp');
  
  if (req.body && req.body.method === 'tools/call' && req.body.params?.name) {
    trackToolCall(req.body.params.name, req);
  }
  
  try {
    let openwebuiUrl = req.query.url as string || '';
    const apiKey = req.query.key as string || '';
    
    if (openwebuiUrl && !openwebuiUrl.match(/^https?:\/\//)) {
      openwebuiUrl = `https://${openwebuiUrl}`;
    }
    
    if (!openwebuiUrl || !apiKey) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Please provide Open WebUI credentials via query parameters: ?url=YOUR_OPENWEBUI_URL&key=YOUR_API_KEY',
        example: '/mcp?url=https://your-openwebui.com&key=your-api-key',
      });
    }
    
    const credentialsKey = `${openwebuiUrl}:${apiKey.substring(0, 8)}`;
    
    let mcpServer = mcpServers.get(credentialsKey);
    if (!mcpServer) {
      mcpServer = createMcpServer(openwebuiUrl, apiKey);
      mcpServers.set(credentialsKey, mcpServer);
    }
    
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    
    res.on('close', () => {
      transport.close();
    });
    
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', details: String(error) });
    }
  }
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  clearInterval(saveInterval);
  saveAnalytics();
  if (firebaseAnalytics.isInitialized()) {
    await firebaseAnalytics.saveAnalytics(analytics);
  }
  console.log('Analytics saved. Goodbye!');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
app.listen(PORT, HOST, () => {
  console.log(`\n🚀 Open WebUI MCP Server running on http://${HOST}:${PORT}`);
  console.log(`   Health: http://${HOST}:${PORT}/health`);
  console.log(`   MCP:    http://${HOST}:${PORT}/mcp`);
  console.log(`   Analytics: http://${HOST}:${PORT}/analytics`);
  console.log(`   Dashboard: http://${HOST}:${PORT}/analytics/dashboard`);
  console.log(`\n📊 Analytics will be saved to: ${ANALYTICS_FILE}`);
});
