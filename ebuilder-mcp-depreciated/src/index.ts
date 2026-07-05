#!/usr/bin/env node
/**
 * MCP Server generated from OpenAPI spec for unity-construct-apis vv1
 * Generated on: 2026-06-25T10:09:50.392Z
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
  type CallToolResult,
  type CallToolRequest
} from "@modelcontextprotocol/sdk/types.js";

import { z, ZodError } from 'zod';
import { jsonSchemaToZod } from 'json-schema-to-zod';
import axios, { type AxiosRequestConfig, type AxiosError } from 'axios';

/**
 * Type definition for JSON objects
 */
type JsonObject = Record<string, any>;

/**
 * Interface for MCP Tool Definition
 */
interface McpToolDefinition {
    name: string;
    description: string;
    inputSchema: any;
    method: string;
    pathTemplate: string;
    executionParameters: { name: string, in: string }[];
    requestBodyContentType?: string;
    securityRequirements: any[];
    tags?: string[];
    deprecated?: boolean;
}

/**
 * Server configuration
 */
export const SERVER_NAME = "unity-construct-apis";
export const SERVER_VERSION = "v1";
// Base URL for the API, can be set via environment variable or determined from OpenAPI spec
export const API_BASE_URL = process.env.API_BASE_URL || "https://api2.e-builder.net";
console.error("API_BASE_URL is set to:", API_BASE_URL);

/**
 * MCP Server instance
 */
const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
);

/**
 * Map of tool definitions by name
 */
const toolDefinitionMap: Map<string, McpToolDefinition> = new Map([

  ["POST_api_v2_AccountCodeOptions_Import", {
    name: "POST_api_v2_AccountCodeOptions_Import",
    description: `This endpoint imports AccountCodeOptions records
(Tags: AccountCodeOptions)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/AccountCodeOptions/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["AccountCodeOptions"],
    deprecated: false
  }],
  ["GET_api_v2_AccountFundingAdjustments", {
    name: "GET_api_v2_AccountFundingAdjustments",
    description: `This endpoint returns Account Funding Adjustments
(Tags: AccountFunding)`,
    inputSchema: {"type":"object","properties":{"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/AccountFundingAdjustments",
    executionParameters: [{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["AccountFunding"],
    deprecated: false
  }],
  ["GET_api_v2_AccountFundingDistributions", {
    name: "GET_api_v2_AccountFundingDistributions",
    description: `This endpoint returns Account Funding Distributions
(Tags: AccountFunding)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/AccountFundingDistributions",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["AccountFunding"],
    deprecated: false
  }],
  ["GET_api_v2_AccountFundingRules", {
    name: "GET_api_v2_AccountFundingRules",
    description: `This endpoint returns Account Funding Rules
(Tags: AccountFunding)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/AccountFundingRules",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["AccountFunding"],
    deprecated: false
  }],
  ["GET_api_v2_AccountFundingRules_id", {
    name: "GET_api_v2_AccountFundingRules_id",
    description: `This endpoint returns Account Funding Rules by ID
(Tags: AccountFunding)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/AccountFundingRules/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["AccountFunding"],
    deprecated: false
  }],
  ["GET_api_v2_AccountFundingRules_distributions_id", {
    name: "GET_api_v2_AccountFundingRules_distributions_id",
    description: `This endpoint returns Account Funding Rule distributions
(Tags: AccountFunding)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/AccountFundingRules/{id}/distributions",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["AccountFunding"],
    deprecated: false
  }],
  ["GET_api_v2_AccountFundingSources", {
    name: "GET_api_v2_AccountFundingSources",
    description: `This endpoint returns Account Funding Sources
(Tags: AccountFunding)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/AccountFundingSources",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["AccountFunding"],
    deprecated: false
  }],
  ["GET_api_v2_AccountFundingSources_id", {
    name: "GET_api_v2_AccountFundingSources_id",
    description: `This endpoint returns Account Funding Sources by ID
(Tags: AccountFunding)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/AccountFundingSources/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["AccountFunding"],
    deprecated: false
  }],
  ["GET_api_v2_AccountFundingSources_customfields_id", {
    name: "GET_api_v2_AccountFundingSources_customfields_id",
    description: `This endpoint returns Account Funding Source custom fields
(Tags: AccountFunding)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/AccountFundingSources/{id}/customfields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["AccountFunding"],
    deprecated: false
  }],
  ["GET_api_v2_AccountFundingSources_adjustments_id", {
    name: "GET_api_v2_AccountFundingSources_adjustments_id",
    description: `This endpoint returns Account Funding Source adjustments
(Tags: AccountFunding)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/AccountFundingSources/{id}/adjustments",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["AccountFunding"],
    deprecated: false
  }],
  ["GET_api_v2_AccountFundingSources_transactions_id", {
    name: "GET_api_v2_AccountFundingSources_transactions_id",
    description: `This endpoint returns Account Funding Source transactions
(Tags: AccountFunding)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/AccountFundingSources/{id}/transactions",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["AccountFunding"],
    deprecated: false
  }],
  ["GET_api_v2_AccountFundingTransactions", {
    name: "GET_api_v2_AccountFundingTransactions",
    description: `This endpoint returns Account Funding Transactions
(Tags: AccountFunding)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/AccountFundingTransactions",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["AccountFunding"],
    deprecated: false
  }],
  ["POST_api_v2_BudgetChanges_Import", {
    name: "POST_api_v2_BudgetChanges_Import",
    description: `This endpoint imports BudgetChanges records
(Tags: BudgetChanges)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/BudgetChanges/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["BudgetChanges"],
    deprecated: false
  }],
  ["POST_api_v2_BudgetChanges_Query", {
    name: "POST_api_v2_BudgetChanges_Query",
    description: `This endpoint returns Budget Change records and related data
(Tags: BudgetChanges)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/BudgetChanges/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["BudgetChanges"],
    deprecated: false
  }],
  ["PUT_api_v2_BudgetChanges_StatusUpdate", {
    name: "PUT_api_v2_BudgetChanges_StatusUpdate",
    description: `This endpoint imports BudgetChangesStatusUpdate records
(Tags: BudgetChanges)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "put",
    pathTemplate: "/api/v2/BudgetChanges/StatusUpdate",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["BudgetChanges"],
    deprecated: false
  }],
  ["POST_api_v2_BudgetChangeProcesses_Import", {
    name: "POST_api_v2_BudgetChangeProcesses_Import",
    description: `This endpoint imports BudgetChangeProcesses records
(Tags: BudgetChangeProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"processPrefix":{"type":["string","null"],"default":""},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/BudgetChangeProcesses/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"},{"name":"processPrefix","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["BudgetChangeProcesses"],
    deprecated: false
  }],
  ["POST_api_v2_BudgetChangeProcesses_Query", {
    name: "POST_api_v2_BudgetChangeProcesses_Query",
    description: `This endpoint returns Budget Change Process records and related data
(Tags: BudgetChangeProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"processPrefix":{"type":["string","null"],"default":""},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/BudgetChangeProcesses/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"processPrefix","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["BudgetChangeProcesses"],
    deprecated: false
  }],
  ["POST_api_v2_BudgetChangeProcesses_DynamicGrid_Query", {
    name: "POST_api_v2_BudgetChangeProcesses_DynamicGrid_Query",
    description: `This endpoint returns Budget Change Process Dynamic Grid records and related data
(Tags: BudgetChangeProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"processPrefix":{"type":["string","null"],"default":""},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"gridName":{"type":["string","null"],"default":""},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/BudgetChangeProcesses/DynamicGrid/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"processPrefix","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"},{"name":"gridName","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["BudgetChangeProcesses"],
    deprecated: false
  }],
  ["GET_api_v2_CashFlows", {
    name: "GET_api_v2_CashFlows",
    description: `This endpoint returns Cash Flows
(Tags: CashFlow)`,
    inputSchema: {"type":"object","properties":{"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/CashFlows",
    executionParameters: [{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CashFlow"],
    deprecated: false
  }],
  ["GET_api_v2_CashFlows_id", {
    name: "GET_api_v2_CashFlows_id",
    description: `This endpoint returns Cash Flows by ID
(Tags: CashFlow)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/CashFlows/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CashFlow"],
    deprecated: false
  }],
  ["GET_api_v2_CashFlows_items_id", {
    name: "GET_api_v2_CashFlows_items_id",
    description: `This endpoint returns Cash Flow items
(Tags: CashFlow)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"month":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/CashFlows/{id}/items",
    executionParameters: [{"name":"id","in":"path"},{"name":"month","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CashFlow"],
    deprecated: false
  }],
  ["GET_api_v2_CashFlows_customFields_id", {
    name: "GET_api_v2_CashFlows_customFields_id",
    description: `This endpoint returns Cash Flow custom fields
(Tags: CashFlow)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/CashFlows/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CashFlow"],
    deprecated: false
  }],
  ["POST_api_v2_CommitmentChangeProcesses_Import", {
    name: "POST_api_v2_CommitmentChangeProcesses_Import",
    description: `This endpoint imports CommitmentChangeProcesses records
(Tags: CommitmentChangeProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"processPrefix":{"type":["string","null"],"default":""},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/CommitmentChangeProcesses/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"},{"name":"processPrefix","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentChangeProcesses"],
    deprecated: false
  }],
  ["POST_api_v2_CommitmentChangeProcesses_Query", {
    name: "POST_api_v2_CommitmentChangeProcesses_Query",
    description: `This endpoint returns Commitment Change Process records and related data
(Tags: CommitmentChangeProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"processPrefix":{"type":["string","null"],"default":""},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/CommitmentChangeProcesses/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"processPrefix","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentChangeProcesses"],
    deprecated: false
  }],
  ["POST_api_v2_CommitmentChangeProcesses_DynamicGrid_Query", {
    name: "POST_api_v2_CommitmentChangeProcesses_DynamicGrid_Query",
    description: `This endpoint returns Commitment Change Process Dynamic Grid records and related data
(Tags: CommitmentChangeProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"processPrefix":{"type":["string","null"],"default":""},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"gridName":{"type":["string","null"],"default":""},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/CommitmentChangeProcesses/DynamicGrid/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"processPrefix","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"},{"name":"gridName","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentChangeProcesses"],
    deprecated: false
  }],
  ["GET_api_v2_CommitmentChanges", {
    name: "GET_api_v2_CommitmentChanges",
    description: `This endpoint returns Commitment Changes
(Tags: CommitmentChanges)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/CommitmentChanges",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentChanges"],
    deprecated: false
  }],
  ["GET_api_v2_CommitmentChanges_id", {
    name: "GET_api_v2_CommitmentChanges_id",
    description: `This endpoint returns Commitment Changes by ID
(Tags: CommitmentChanges)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/CommitmentChanges/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentChanges"],
    deprecated: false
  }],
  ["GET_api_v2_CommitmentChanges_customfields_id", {
    name: "GET_api_v2_CommitmentChanges_customfields_id",
    description: `This endpoint returns Commitment Change custom fields
(Tags: CommitmentChanges)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/CommitmentChanges/{id}/customfields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentChanges"],
    deprecated: false
  }],
  ["GET_api_v2_CommitmentChanges_items_id", {
    name: "GET_api_v2_CommitmentChanges_items_id",
    description: `This endpoint returns Commitment Change items
(Tags: CommitmentChanges)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/CommitmentChanges/{id}/items",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentChanges"],
    deprecated: false
  }],
  ["POST_api_v2_CommitmentChanges_Query", {
    name: "POST_api_v2_CommitmentChanges_Query",
    description: `This endpoint returns Commitment Change records and related data
(Tags: CommitmentChanges)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/CommitmentChanges/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentChanges"],
    deprecated: false
  }],
  ["PUT_api_v2_CommitmentChanges_StatusUpdate", {
    name: "PUT_api_v2_CommitmentChanges_StatusUpdate",
    description: `This endpoint updates Commitment Changes Statuses
(Tags: CommitmentChanges)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "put",
    pathTemplate: "/api/v2/CommitmentChanges/StatusUpdate",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentChanges"],
    deprecated: false
  }],
  ["POST_api_v2_CommitmentChanges_Import", {
    name: "POST_api_v2_CommitmentChanges_Import",
    description: `This endpoint imports Commitment Change records
(Tags: CommitmentChanges)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/CommitmentChanges/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentChanges"],
    deprecated: false
  }],
  ["POST_api_v2_AccountFundingProcesses_Import", {
    name: "POST_api_v2_AccountFundingProcesses_Import",
    description: `This endpoint imports AccountFundingProcesses records
(Tags: AccountFundingProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"processPrefix":{"type":["string","null"],"default":""},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/AccountFundingProcesses/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"},{"name":"processPrefix","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["AccountFundingProcesses"],
    deprecated: false
  }],
  ["GET_api_v2_MasterCommitmentChanges_id", {
    name: "GET_api_v2_MasterCommitmentChanges_id",
    description: `This endpoint returns Master Commitment Changes by ID
(Tags: MasterCommitments)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/MasterCommitmentChanges/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterCommitments"],
    deprecated: false
  }],
  ["GET_api_v2_MasterCommitmentChanges_items_id", {
    name: "GET_api_v2_MasterCommitmentChanges_items_id",
    description: `This endpoint returns Master Commitment Change items
(Tags: MasterCommitments)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/MasterCommitmentChanges/{id}/items",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterCommitments"],
    deprecated: false
  }],
  ["GET_api_v2_MasterCommitmentChanges_customFields_id", {
    name: "GET_api_v2_MasterCommitmentChanges_customFields_id",
    description: `This endpoint returns Master Commitment Change custom fields
(Tags: MasterCommitments)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/MasterCommitmentChanges/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterCommitments"],
    deprecated: false
  }],
  ["POST_api_v2_MasterCommitmentChanges_Import", {
    name: "POST_api_v2_MasterCommitmentChanges_Import",
    description: `This endpoint imports Master Commitment Change records
(Tags: MasterCommitmentChanges)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/MasterCommitmentChanges/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterCommitmentChanges"],
    deprecated: false
  }],
  ["GET_api_v2_CommitmentInvoices", {
    name: "GET_api_v2_CommitmentInvoices",
    description: `This endpoint returns Commitment Invoices
(Tags: CommitmentInvoices)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/CommitmentInvoices",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentInvoices"],
    deprecated: false
  }],
  ["GET_api_v2_CommitmentInvoices_id", {
    name: "GET_api_v2_CommitmentInvoices_id",
    description: `This endpoint returns Commitment Invoices by ID
(Tags: CommitmentInvoices)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/CommitmentInvoices/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentInvoices"],
    deprecated: false
  }],
  ["GET_api_v2_CommitmentInvoices_items_id", {
    name: "GET_api_v2_CommitmentInvoices_items_id",
    description: `This endpoint returns Commitment Invoice items
(Tags: CommitmentInvoices)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/CommitmentInvoices/{id}/items",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentInvoices"],
    deprecated: false
  }],
  ["GET_api_v2_CommitmentInvoices_customFields_id", {
    name: "GET_api_v2_CommitmentInvoices_customFields_id",
    description: `This endpoint returns Commitment Invoice custom fields
(Tags: CommitmentInvoices)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/CommitmentInvoices/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentInvoices"],
    deprecated: false
  }],
  ["GET_api_v2_CommitmentInvoiceItems_id", {
    name: "GET_api_v2_CommitmentInvoiceItems_id",
    description: `This endpoint returns Commitment Invoice Items by ID
(Tags: CommitmentInvoices)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/CommitmentInvoiceItems/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentInvoices"],
    deprecated: false
  }],
  ["GET_api_v2_CommitmentInvoiceItems_customFields_id", {
    name: "GET_api_v2_CommitmentInvoiceItems_customFields_id",
    description: `This endpoint returns Commitment Invoice Item custom fields
(Tags: CommitmentInvoices)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/CommitmentInvoiceItems/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentInvoices"],
    deprecated: false
  }],
  ["POST_api_v2_CommitmentInvoices_Query", {
    name: "POST_api_v2_CommitmentInvoices_Query",
    description: `This endpoint returns Commitment Invoice records and related data
(Tags: CommitmentInvoices)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/CommitmentInvoices/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentInvoices"],
    deprecated: false
  }],
  ["POST_api_v2_CommitmentProcesses_Import", {
    name: "POST_api_v2_CommitmentProcesses_Import",
    description: `This endpoint imports Commitment Process records
(Tags: CommitmentProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"processPrefix":{"type":["string","null"],"default":""},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/CommitmentProcesses/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"},{"name":"processPrefix","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentProcesses"],
    deprecated: false
  }],
  ["POST_api_v2_CommitmentProcesses_Query", {
    name: "POST_api_v2_CommitmentProcesses_Query",
    description: `This endpoint returns Commitment Process records and related data
(Tags: CommitmentProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"processPrefix":{"type":["string","null"],"default":""},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/CommitmentProcesses/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"processPrefix","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentProcesses"],
    deprecated: false
  }],
  ["POST_api_v2_CommitmentProcesses_DynamicGrid_Query", {
    name: "POST_api_v2_CommitmentProcesses_DynamicGrid_Query",
    description: `This endpoint returns Commitment Process Dynamic Grid records and related data
(Tags: CommitmentProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"processPrefix":{"type":["string","null"],"default":""},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"gridName":{"type":["string","null"],"default":""},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/CommitmentProcesses/DynamicGrid/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"processPrefix","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"},{"name":"gridName","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["CommitmentProcesses"],
    deprecated: false
  }],
  ["GET_api_v2_Commitments", {
    name: "GET_api_v2_Commitments",
    description: `This endpoint returns Commitments
(Tags: Commitments)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/Commitments",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Commitments"],
    deprecated: false
  }],
  ["GET_api_v2_Commitments_id", {
    name: "GET_api_v2_Commitments_id",
    description: `This endpoint returns Commitments by ID
(Tags: Commitments)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Commitments/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Commitments"],
    deprecated: false
  }],
  ["GET_api_v2_Commitments_customfields_id", {
    name: "GET_api_v2_Commitments_customfields_id",
    description: `This endpoint returns Commitment custom fields
(Tags: Commitments)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Commitments/{id}/customfields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Commitments"],
    deprecated: false
  }],
  ["GET_api_v2_Commitments_items_id", {
    name: "GET_api_v2_Commitments_items_id",
    description: `This endpoint returns Commitment items
(Tags: Commitments)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Commitments/{id}/items",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Commitments"],
    deprecated: false
  }],
  ["GET_api_v2_Commitments_changes_id", {
    name: "GET_api_v2_Commitments_changes_id",
    description: `This endpoint returns Commitment changes
(Tags: Commitments)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Commitments/{id}/changes",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Commitments"],
    deprecated: false
  }],
  ["GET_api_v2_CommitmentItems_customfields_id", {
    name: "GET_api_v2_CommitmentItems_customfields_id",
    description: `This endpoint returns Commitment Item custom fields
(Tags: Commitments)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/CommitmentItems/{id}/customfields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Commitments"],
    deprecated: false
  }],
  ["POST_api_v2_Commitments_Query", {
    name: "POST_api_v2_Commitments_Query",
    description: `This endpoint returns Commitment records and related data
(Tags: Commitments)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/Commitments/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Commitments"],
    deprecated: false
  }],
  ["POST_api_v2_Commitments_Import", {
    name: "POST_api_v2_Commitments_Import",
    description: `This endpoint imports Commitment records
(Tags: Commitments)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/Commitments/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Commitments"],
    deprecated: false
  }],
  ["PUT_api_v2_Commitments_StatusUpdate", {
    name: "PUT_api_v2_Commitments_StatusUpdate",
    description: `This endpoint imports CommitmentsStatusUpdate records
(Tags: Commitments)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "put",
    pathTemplate: "/api/v2/Commitments/StatusUpdate",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Commitments"],
    deprecated: false
  }],
  ["GET_api_v2_Companies", {
    name: "GET_api_v2_Companies",
    description: `This endpoint returns Companies
(Tags: Companies)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/Companies",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Companies"],
    deprecated: false
  }],
  ["GET_api_v2_Companies_id", {
    name: "GET_api_v2_Companies_id",
    description: `This endpoint returns Companies by ID
(Tags: Companies)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Companies/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Companies"],
    deprecated: false
  }],
  ["GET_api_v2_Companies_contacts_id", {
    name: "GET_api_v2_Companies_contacts_id",
    description: `This endpoint returns Contacts
(Tags: Companies)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Companies/{id}/contacts",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Companies"],
    deprecated: false
  }],
  ["GET_api_v2_Companies_customFields_id", {
    name: "GET_api_v2_Companies_customFields_id",
    description: `This endpoint returns company custom fields
(Tags: Companies)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Companies/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Companies"],
    deprecated: false
  }],
  ["POST_api_v2_Companies_Import", {
    name: "POST_api_v2_Companies_Import",
    description: `This endpoint imports Company records
(Tags: Companies)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object","properties":{"updateDuplicates":{"type":"boolean"},"abortOnException":{"type":"boolean"}}},"data":{"type":"array","items":{"type":"object","properties":{"companyName":{"type":"string"},"address":{"type":"string"},"city":{"type":"string"},"state":{"type":"string"},"zip":{"type":"string"},"country":{"type":"string"},"phone":{"type":"string"},"webSiteUrl":{"type":"string"},"classificationWbe":{"type":"boolean"},"classificationMbe":{"type":"boolean"},"classificationDbe":{"type":"boolean"},"classificationVbe":{"type":"boolean"},"classificationSbe":{"type":"boolean"},"classificationOther":{"type":"boolean"},"customFields":{"type":"object","properties":{"CompanyNumber_New":{"type":"string"}}}}}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/Companies/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Companies"],
    deprecated: false
  }],
  ["POST_api_v2_Companies_query", {
    name: "POST_api_v2_Companies_query",
    description: `This endpoint returns Company records and related data
(Tags: Companies)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"processPrefix":{"type":["string","null"],"default":""},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/Companies/query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"processPrefix","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Companies"],
    deprecated: false
  }],
  ["GET_api_v2_Budgets", {
    name: "GET_api_v2_Budgets",
    description: `This endpoint returns Budgets
(Tags: Budgets)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/Budgets",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Budgets"],
    deprecated: false
  }],
  ["GET_api_v2_Budgets_id", {
    name: "GET_api_v2_Budgets_id",
    description: `This endpoint returns Budgets by ID
(Tags: Budgets)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Budgets/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Budgets"],
    deprecated: false
  }],
  ["GET_api_v2_Budgets_items_id", {
    name: "GET_api_v2_Budgets_items_id",
    description: `This endpoint returns Budget items
(Tags: Budgets)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Budgets/{id}/items",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Budgets"],
    deprecated: false
  }],
  ["GET_api_v2_Budgets_changes_id", {
    name: "GET_api_v2_Budgets_changes_id",
    description: `This endpoint returns Budget changes
(Tags: Budgets)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Budgets/{id}/changes",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Budgets"],
    deprecated: false
  }],
  ["GET_api_v2_Budgets_customFields_id", {
    name: "GET_api_v2_Budgets_customFields_id",
    description: `This endpoint returns Budget custom fields
(Tags: Budgets)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Budgets/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Budgets"],
    deprecated: false
  }],
  ["GET_api_v2_Budgets_budgetChangeReasonCodes", {
    name: "GET_api_v2_Budgets_budgetChangeReasonCodes",
    description: `This endpoint returns Budget reason codes
(Tags: Budgets)`,
    inputSchema: {"type":"object","properties":{"changeReasonCodeId":{"type":["string","null"],"format":"guid"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/Budgets/budgetChangeReasonCodes",
    executionParameters: [{"name":"changeReasonCodeId","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Budgets"],
    deprecated: false
  }],
  ["POST_api_v2_BudgetLineItems_Import", {
    name: "POST_api_v2_BudgetLineItems_Import",
    description: `This endpoint imports BudgetLineItems records
(Tags: Budgets)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/BudgetLineItems/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Budgets"],
    deprecated: false
  }],
  ["POST_api_v2_Budgets_Query", {
    name: "POST_api_v2_Budgets_Query",
    description: `This endpoint returns Budget records and related data
(Tags: Budgets)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/Budgets/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Budgets"],
    deprecated: false
  }],
  ["GET_api_v2_Contacts", {
    name: "GET_api_v2_Contacts",
    description: `This endpoint returns Contacts
(Tags: Contacts)`,
    inputSchema: {"type":"object","properties":{"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/Contacts",
    executionParameters: [{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Contacts"],
    deprecated: false
  }],
  ["GET_api_v2_Contacts_id", {
    name: "GET_api_v2_Contacts_id",
    description: `This endpoint returns Contacts by ID
(Tags: Contacts)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Contacts/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Contacts"],
    deprecated: false
  }],
  ["GET_api_v2_Contacts_customFields_id", {
    name: "GET_api_v2_Contacts_customFields_id",
    description: `This endpoint returns Contact custom fields
(Tags: Contacts)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Contacts/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Contacts"],
    deprecated: false
  }],
  ["POST_api_v2_Contacts_Import", {
    name: "POST_api_v2_Contacts_Import",
    description: `This endpoint imports Contact records
(Tags: Contacts)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/Contacts/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Contacts"],
    deprecated: false
  }],
  ["GET_api_v2_CostItemFundingDistributions", {
    name: "GET_api_v2_CostItemFundingDistributions",
    description: `This endpoint returns Cost Item Distributions
(Tags: FundingDistributions)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/CostItemFundingDistributions",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["FundingDistributions"],
    deprecated: false
  }],
  ["GET_api_v2_Counters", {
    name: "GET_api_v2_Counters",
    description: `This endpoint returns System Counter records
(Tags: System)`,
    inputSchema: {"type":"object","properties":{"lastModifiedDate":{"type":["string","null"],"format":"date-time"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/Counters",
    executionParameters: [{"name":"lastModifiedDate","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["System"],
    deprecated: false
  }],
  ["POST_api_v2_Documents_Create", {
    name: "POST_api_v2_Documents_Create",
    description: `This endpoint creates Documents
(Tags: Documents)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/Documents/Create",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Documents"],
    deprecated: false
  }],
  ["POST_api_v2_Documents_Import", {
    name: "POST_api_v2_Documents_Import",
    description: `This endpoint imports Documents
(Tags: Documents)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/Documents/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Documents"],
    deprecated: false
  }],
  ["POST_api_v2_Documents_Query", {
    name: "POST_api_v2_Documents_Query",
    description: `This endpoint returns Document records and related data
(Tags: Documents)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"schema":{"type":"boolean","default":false},"pageSize":{"type":"number","format":"int32","default":0},"pageNumber":{"type":"number","format":"int32","default":0},"includeAllVersions":{"type":["string","null"],"default":"false"},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/Documents/Query",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"schema","in":"query"},{"name":"pageSize","in":"query"},{"name":"pageNumber","in":"query"},{"name":"includeAllVersions","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Documents"],
    deprecated: false
  }],
  ["GET_api_v2_Forecasts", {
    name: "GET_api_v2_Forecasts",
    description: `This endpoint returns Forecasts
(Tags: Forecasts)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/Forecasts",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Forecasts"],
    deprecated: false
  }],
  ["GET_api_v2_Forecasts_id", {
    name: "GET_api_v2_Forecasts_id",
    description: `This endpoint returns Forecasts by ID
(Tags: Forecasts)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Forecasts/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Forecasts"],
    deprecated: false
  }],
  ["GET_api_v2_Forecasts_items_id", {
    name: "GET_api_v2_Forecasts_items_id",
    description: `This endpoint returns Forecast items
(Tags: Forecasts)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Forecasts/{id}/items",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Forecasts"],
    deprecated: false
  }],
  ["GET_api_v2_Forecasts_adjustments_id", {
    name: "GET_api_v2_Forecasts_adjustments_id",
    description: `This endpoint returns Forecast adjustments
(Tags: Forecasts)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Forecasts/{id}/adjustments",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Forecasts"],
    deprecated: false
  }],
  ["GET_api_v2_ForecastItems", {
    name: "GET_api_v2_ForecastItems",
    description: `This endpoint returns Forecast Items
(Tags: Forecasts)`,
    inputSchema: {"type":"object","properties":{"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/ForecastItems",
    executionParameters: [{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Forecasts"],
    deprecated: false
  }],
  ["GET_api_v2_ForecastItems_id", {
    name: "GET_api_v2_ForecastItems_id",
    description: `This endpoint returns Forecast Items by ID
(Tags: Forecasts)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/ForecastItems/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Forecasts"],
    deprecated: false
  }],
  ["GET_api_v2_ForecastItems_adjustments_id", {
    name: "GET_api_v2_ForecastItems_adjustments_id",
    description: `This endpoint returns Forecast Item adjustments
(Tags: Forecasts)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/ForecastItems/{id}/adjustments",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Forecasts"],
    deprecated: false
  }],
  ["GET_api_v2_ForecastItems_details_id", {
    name: "GET_api_v2_ForecastItems_details_id",
    description: `This endpoint returns Forecast Item details
(Tags: Forecasts)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/ForecastItems/{id}/details",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Forecasts"],
    deprecated: false
  }],
  ["GET_api_v2_FormTypes", {
    name: "GET_api_v2_FormTypes",
    description: `This endpoint returns Forms types
(Tags: Forms)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/FormTypes",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Forms"],
    deprecated: false
  }],
  ["GET_api_v2_FormTypes_id", {
    name: "GET_api_v2_FormTypes_id",
    description: `This endpoint returns Form Types by ID
(Tags: Forms)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/FormTypes/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Forms"],
    deprecated: false
  }],
  ["GET_api_v2_FormTypes_forms_id", {
    name: "GET_api_v2_FormTypes_forms_id",
    description: `This endpoint returns Form Types
(Tags: Forms)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/FormTypes/{id}/forms",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Forms"],
    deprecated: false
  }],
  ["GET_api_v2_FormTypes_customFields_id", {
    name: "GET_api_v2_FormTypes_customFields_id",
    description: `This endpoint returns Form Type custom fields
(Tags: Forms)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/FormTypes/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Forms"],
    deprecated: false
  }],
  ["GET_api_v2_Forms_id", {
    name: "GET_api_v2_Forms_id",
    description: `This endpoint returns Forms by ID
(Tags: Forms)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Forms/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Forms"],
    deprecated: false
  }],
  ["GET_api_v2_Forms_formFields_id", {
    name: "GET_api_v2_Forms_formFields_id",
    description: `This endpoint returns form fields
(Tags: Forms)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Forms/{id}/formFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Forms"],
    deprecated: false
  }],
  ["GET_api_v2_FundingDistributions", {
    name: "GET_api_v2_FundingDistributions",
    description: `This endpoint returns Funding Distributions
(Tags: FundingDistributions)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/FundingDistributions",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["FundingDistributions"],
    deprecated: false
  }],
  ["GET_api_v2_FundingDistributions_id", {
    name: "GET_api_v2_FundingDistributions_id",
    description: `This endpoint returns Funding Distributions by ID
(Tags: FundingDistributions)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/FundingDistributions/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["FundingDistributions"],
    deprecated: false
  }],
  ["GET_api_v2_FundingRules", {
    name: "GET_api_v2_FundingRules",
    description: `This endpoint returns Funding Rules
(Tags: FundingRules)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/FundingRules",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["FundingRules"],
    deprecated: false
  }],
  ["GET_api_v2_FundingRules_id", {
    name: "GET_api_v2_FundingRules_id",
    description: `This endpoint returns Funding Rules by ID
(Tags: FundingRules)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/FundingRules/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["FundingRules"],
    deprecated: false
  }],
  ["GET_api_v2_FundingRules_distributions_id", {
    name: "GET_api_v2_FundingRules_distributions_id",
    description: `This endpoint returns Funding Rules distributions
(Tags: FundingRules)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/FundingRules/{id}/distributions",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["FundingRules"],
    deprecated: false
  }],
  ["GET_api_v2_FundingSourceAdjustments", {
    name: "GET_api_v2_FundingSourceAdjustments",
    description: `This endpoint returns Funding Source Adjustments
(Tags: FundingSources)`,
    inputSchema: {"type":"object","properties":{"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/FundingSourceAdjustments",
    executionParameters: [{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["FundingSources"],
    deprecated: false
  }],
  ["GET_api_v2_FundingSourceAdjustments_id", {
    name: "GET_api_v2_FundingSourceAdjustments_id",
    description: `This endpoint returns Funding Source Adjustments by ID
(Tags: FundingSourceAdjustments)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/FundingSourceAdjustments/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["FundingSourceAdjustments"],
    deprecated: false
  }],
  ["GET_api_v2_FundingSources", {
    name: "GET_api_v2_FundingSources",
    description: `This endpoint returns Funding Sources
(Tags: FundingSources)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/FundingSources",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["FundingSources"],
    deprecated: false
  }],
  ["GET_api_v2_FundingSources_id", {
    name: "GET_api_v2_FundingSources_id",
    description: `This endpoint returns Funding Source by ID
(Tags: FundingSources)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/FundingSources/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["FundingSources"],
    deprecated: false
  }],
  ["GET_api_v2_FundingSources_customfields_id", {
    name: "GET_api_v2_FundingSources_customfields_id",
    description: `This endpoint returns Funding Source custom fields
(Tags: FundingSources)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/FundingSources/{id}/customfields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["FundingSources"],
    deprecated: false
  }],
  ["GET_api_v2_FundingSources_adjustments_id", {
    name: "GET_api_v2_FundingSources_adjustments_id",
    description: `This endpoint returns Funding Source adjustments
(Tags: FundingSources)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/FundingSources/{id}/adjustments",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["FundingSources"],
    deprecated: false
  }],
  ["POST_api_v2_ProjectFundingSources_Query", {
    name: "POST_api_v2_ProjectFundingSources_Query",
    description: `This endpoint returns Funding Source records and related data
(Tags: FundingSources)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/ProjectFundingSources/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["FundingSources"],
    deprecated: false
  }],
  ["POST_api_v2_ProjectFundingSources_Import", {
    name: "POST_api_v2_ProjectFundingSources_Import",
    description: `This endpoint imports Project Funding Sources records
(Tags: FundingSources)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/ProjectFundingSources/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["FundingSources"],
    deprecated: false
  }],
  ["GET_api_v2_GeneralInvoices", {
    name: "GET_api_v2_GeneralInvoices",
    description: `This endpoint returns General Invoices
(Tags: GeneralInvoices)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/GeneralInvoices",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["GeneralInvoices"],
    deprecated: false
  }],
  ["PUT_api_v2_GeneralInvoices_StatusUpdate", {
    name: "PUT_api_v2_GeneralInvoices_StatusUpdate",
    description: `This endpoint updates General Invoice Statuses
(Tags: GeneralInvoices)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "put",
    pathTemplate: "/api/v2/GeneralInvoices/StatusUpdate",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["GeneralInvoices"],
    deprecated: false
  }],
  ["GET_api_v2_GeneralInvoices_id", {
    name: "GET_api_v2_GeneralInvoices_id",
    description: `This endpoint returns General Invoices by ID
(Tags: GeneralInvoices)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/GeneralInvoices/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["GeneralInvoices"],
    deprecated: false
  }],
  ["GET_api_v2_GeneralInvoices_items_id", {
    name: "GET_api_v2_GeneralInvoices_items_id",
    description: `This endpoint returns General Invoice items
(Tags: GeneralInvoices)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/GeneralInvoices/{id}/items",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["GeneralInvoices"],
    deprecated: false
  }],
  ["GET_api_v2_GeneralInvoices_customFields_id", {
    name: "GET_api_v2_GeneralInvoices_customFields_id",
    description: `This endpoint returns General Invoice custom fields
(Tags: GeneralInvoices)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/GeneralInvoices/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["GeneralInvoices"],
    deprecated: false
  }],
  ["GET_api_v2_GeneralInvoiceItems_id", {
    name: "GET_api_v2_GeneralInvoiceItems_id",
    description: `This endpoint returns General Invoice Items by ID
(Tags: GeneralInvoices)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/GeneralInvoiceItems/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["GeneralInvoices"],
    deprecated: false
  }],
  ["GET_api_v2_GeneralInvoiceItems_customFields_id", {
    name: "GET_api_v2_GeneralInvoiceItems_customFields_id",
    description: `This endpoint returns General Invoice Item custom fields
(Tags: GeneralInvoices)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/GeneralInvoiceItems/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["GeneralInvoices"],
    deprecated: false
  }],
  ["POST_api_v2_GeneralInvoices_Query", {
    name: "POST_api_v2_GeneralInvoices_Query",
    description: `This endpoint returns General Invoice records and related data
(Tags: GeneralInvoices)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/GeneralInvoices/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["GeneralInvoices"],
    deprecated: false
  }],
  ["GET_api_v2_Health", {
    name: "GET_api_v2_Health",
    description: `This endpoint returns the System Health status
(Tags: System)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/Health",
    executionParameters: [{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["System"],
    deprecated: false
  }],
  ["POST_api_v2_NonCostProcesses_Import", {
    name: "POST_api_v2_NonCostProcesses_Import",
    description: `This endpoint imports (NonCost) Process records
(Tags: NonCostProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"processPrefix":{"type":["string","null"],"default":""},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/NonCostProcesses/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"},{"name":"processPrefix","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["NonCostProcesses"],
    deprecated: false
  }],
  ["POST_api_v2_NonCostProcesses_Query", {
    name: "POST_api_v2_NonCostProcesses_Query",
    description: `This endpoint returns (Non-Cost) Process records and related data
(Tags: NonCostProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"processPrefix":{"type":["string","null"],"default":""},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/NonCostProcesses/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"processPrefix","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["NonCostProcesses"],
    deprecated: false
  }],
  ["POST_api_v2_NonCostProcesses_DynamicGrid_Query", {
    name: "POST_api_v2_NonCostProcesses_DynamicGrid_Query",
    description: `This endpoint returns (Non-Cost) Process Dynamic Grid records and related data
(Tags: NonCostProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"processPrefix":{"type":["string","null"],"default":""},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"gridName":{"type":["string","null"],"default":""},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/NonCostProcesses/DynamicGrid/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"processPrefix","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"},{"name":"gridName","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["NonCostProcesses"],
    deprecated: false
  }],
  ["POST_api_v2_InvoiceProcesses_Import", {
    name: "POST_api_v2_InvoiceProcesses_Import",
    description: `This endpoint imports InvoiceProcess records
(Tags: InvoiceProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"processPrefix":{"type":["string","null"],"default":""},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/InvoiceProcesses/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"},{"name":"processPrefix","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["InvoiceProcesses"],
    deprecated: false
  }],
  ["POST_api_v2_CommitmentInvoiceProcesses_Query", {
    name: "POST_api_v2_CommitmentInvoiceProcesses_Query",
    description: `This endpoint returns Commitment Invoice Process records and related data
(Tags: InvoiceProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"processPrefix":{"type":["string","null"],"default":""},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/CommitmentInvoiceProcesses/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"},{"name":"processPrefix","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["InvoiceProcesses"],
    deprecated: false
  }],
  ["POST_api_v2_CommitmentInvoiceProcesses_DynamicGrid_Query", {
    name: "POST_api_v2_CommitmentInvoiceProcesses_DynamicGrid_Query",
    description: `This endpoint returns Commitment Invoice Process Dynamic Grid records and related data
(Tags: InvoiceProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"processPrefix":{"type":["string","null"],"default":""},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"gridName":{"type":["string","null"],"default":""},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/CommitmentInvoiceProcesses/DynamicGrid/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"processPrefix","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"},{"name":"gridName","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["InvoiceProcesses"],
    deprecated: false
  }],
  ["POST_api_v2_GeneralInvoiceProcesses_DynamicGrid_Query", {
    name: "POST_api_v2_GeneralInvoiceProcesses_DynamicGrid_Query",
    description: `This endpoint returns General Invoice Process Dynamic Grid records and related data
(Tags: InvoiceProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"processPrefix":{"type":["string","null"],"default":""},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"gridName":{"type":["string","null"],"default":""},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/GeneralInvoiceProcesses/DynamicGrid/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"processPrefix","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"},{"name":"gridName","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["InvoiceProcesses"],
    deprecated: false
  }],
  ["POST_api_v2_GeneralInvoiceProcesses_Query", {
    name: "POST_api_v2_GeneralInvoiceProcesses_Query",
    description: `This endpoint returns General Invoice Process records and related data
(Tags: InvoiceProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"processPrefix":{"type":["string","null"],"default":""},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/GeneralInvoiceProcesses/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"},{"name":"processPrefix","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["InvoiceProcesses"],
    deprecated: false
  }],
  ["POST_api_v2_Invoices_Import", {
    name: "POST_api_v2_Invoices_Import",
    description: `This endpoint imports Invoice records
(Tags: Invoices)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/Invoices/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Invoices"],
    deprecated: false
  }],
  ["POST_api_v2_Invoices_StatusUpdate", {
    name: "POST_api_v2_Invoices_StatusUpdate",
    description: `This endpoint updates invoice statuses
(Tags: Invoices)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/Invoices/StatusUpdate",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Invoices"],
    deprecated: false
  }],
  ["POST_api_v2_MasterCommitmentChangeProcesses_Import", {
    name: "POST_api_v2_MasterCommitmentChangeProcesses_Import",
    description: `This endpoint imports MasterCommitmentChangeProcess records
(Tags: MasterCommitmentChangeProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"processPrefix":{"type":["string","null"],"default":""},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/MasterCommitmentChangeProcesses/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"},{"name":"processPrefix","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterCommitmentChangeProcesses"],
    deprecated: false
  }],
  ["POST_api_v2_MasterCommitmentProcesses_Import", {
    name: "POST_api_v2_MasterCommitmentProcesses_Import",
    description: `This endpoint imports Master Commitment Processes records
(Tags: MasterCommitmentProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"processPrefix":{"type":["string","null"],"default":""},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/MasterCommitmentProcesses/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"},{"name":"processPrefix","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterCommitmentProcesses"],
    deprecated: false
  }],
  ["GET_api_v2_MasterCommitments", {
    name: "GET_api_v2_MasterCommitments",
    description: `This endpoint returns Master Commitments
(Tags: MasterCommitments)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/MasterCommitments",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterCommitments"],
    deprecated: false
  }],
  ["GET_api_v2_MasterCommitments_id", {
    name: "GET_api_v2_MasterCommitments_id",
    description: `This endpoint returns Master Commitments by ID
(Tags: MasterCommitments)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/MasterCommitments/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterCommitments"],
    deprecated: false
  }],
  ["GET_api_v2_MasterCommitments_items_id", {
    name: "GET_api_v2_MasterCommitments_items_id",
    description: `This endpoint returns Master Commitments items
(Tags: MasterCommitments)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/MasterCommitments/{id}/items",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterCommitments"],
    deprecated: false
  }],
  ["GET_api_v2_MasterCommitments_changes_id", {
    name: "GET_api_v2_MasterCommitments_changes_id",
    description: `This endpoint returns Master Commitments changes
(Tags: MasterCommitments)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/MasterCommitments/{id}/changes",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterCommitments"],
    deprecated: false
  }],
  ["GET_api_v2_MasterCommitments_commitments_id", {
    name: "GET_api_v2_MasterCommitments_commitments_id",
    description: `This endpoint returns Master Commitments commitments
(Tags: MasterCommitments)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/MasterCommitments/{id}/commitments",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterCommitments"],
    deprecated: false
  }],
  ["GET_api_v2_MasterCommitments_customFields_id", {
    name: "GET_api_v2_MasterCommitments_customFields_id",
    description: `This endpoint returns Master Commitments custom fields
(Tags: MasterCommitments)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/MasterCommitments/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterCommitments"],
    deprecated: false
  }],
  ["GET_api_v2_MasterCommitmentItems_id", {
    name: "GET_api_v2_MasterCommitmentItems_id",
    description: `This endpoint returns Master Commitment Items by ID
(Tags: MasterCommitments)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/MasterCommitmentItems/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterCommitments"],
    deprecated: false
  }],
  ["GET_api_v2_MasterCommitmentItems_customFields_id", {
    name: "GET_api_v2_MasterCommitmentItems_customFields_id",
    description: `This endpoint returns Master Commitment Items custom fields
(Tags: MasterCommitments)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/MasterCommitmentItems/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterCommitments"],
    deprecated: false
  }],
  ["POST_api_v2_MasterCommitments_Import", {
    name: "POST_api_v2_MasterCommitments_Import",
    description: `This endpoint imports Master Commitment Processes records
(Tags: MasterCommitmentProcesses)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/MasterCommitments/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterCommitmentProcesses"],
    deprecated: false
  }],
  ["GET_api_v2_MasterInvoices", {
    name: "GET_api_v2_MasterInvoices",
    description: `This endpoint returns Master Invoices
(Tags: MasterInvoices)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/MasterInvoices",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterInvoices"],
    deprecated: false
  }],
  ["GET_api_v2_MasterInvoices_id", {
    name: "GET_api_v2_MasterInvoices_id",
    description: `This endpoint returns Master Invoices by ID
(Tags: MasterInvoices)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/MasterInvoices/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterInvoices"],
    deprecated: false
  }],
  ["GET_api_v2_MasterInvoices_items_id", {
    name: "GET_api_v2_MasterInvoices_items_id",
    description: `This endpoint returns Master Invoice items
(Tags: MasterInvoices)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/MasterInvoices/{id}/items",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterInvoices"],
    deprecated: false
  }],
  ["GET_api_v2_MasterInvoices_customFields_id", {
    name: "GET_api_v2_MasterInvoices_customFields_id",
    description: `This endpoint returns Master Invoice custom fields
(Tags: MasterInvoices)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/MasterInvoices/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterInvoices"],
    deprecated: false
  }],
  ["GET_api_v2_MasterInvoiceItems_id", {
    name: "GET_api_v2_MasterInvoiceItems_id",
    description: `This endpoint returns Master Invoice Items by ID
(Tags: MasterInvoices)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/MasterInvoiceItems/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterInvoices"],
    deprecated: false
  }],
  ["GET_api_v2_MasterInvoiceItems_customFields_id", {
    name: "GET_api_v2_MasterInvoiceItems_customFields_id",
    description: `This endpoint returns Master Invoice Item custom fields
(Tags: MasterInvoices)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/MasterInvoiceItems/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["MasterInvoices"],
    deprecated: false
  }],
  ["GET_api_v2_ProcessTypes", {
    name: "GET_api_v2_ProcessTypes",
    description: `This endpoint returns Process Types
(Tags: ProcessDefinitions)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/ProcessTypes",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["ProcessDefinitions"],
    deprecated: false
  }],
  ["GET_api_v2_DynamicCostTypes", {
    name: "GET_api_v2_DynamicCostTypes",
    description: `This endpoint returns Process Dynamic Cost Types
(Tags: ProcessDefinitions)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/DynamicCostTypes",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["ProcessDefinitions"],
    deprecated: false
  }],
  ["GET_api_v2_ProcessTypes_id", {
    name: "GET_api_v2_ProcessTypes_id",
    description: `This endpoint returns a ProcessType by Id
(Tags: ProcessDefinitions)`,
    inputSchema: {"type":"object","properties":{"id":{"type":["string","null"]},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/ProcessTypes/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["ProcessDefinitions"],
    deprecated: false
  }],
  ["GET_api_v2_DynamicCostTypes_id", {
    name: "GET_api_v2_DynamicCostTypes_id",
    description: `This endpoint returns a Dynamic Cost Type by Id
(Tags: ProcessDefinitions)`,
    inputSchema: {"type":"object","properties":{"id":{"type":["string","null"]},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/DynamicCostTypes/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["ProcessDefinitions"],
    deprecated: false
  }],
  ["GET_api_v2_ProcessTypes_instances_id", {
    name: "GET_api_v2_ProcessTypes_instances_id",
    description: `This endpoint returns Process instances
(Tags: ProcessInstances)`,
    inputSchema: {"type":"object","properties":{"id":{"type":["string","null"]},"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/ProcessTypes/{id}/instances",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["ProcessInstances"],
    deprecated: false
  }],
  ["GET_api_v2_ProcessTypes_customFields_id", {
    name: "GET_api_v2_ProcessTypes_customFields_id",
    description: `This endpoint returns Process Definition custom fields
(Tags: ProcessDefinitions)`,
    inputSchema: {"type":"object","properties":{"id":{"type":["string","null"]},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/ProcessTypes/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["ProcessDefinitions"],
    deprecated: false
  }],
  ["GET_api_v2_DynamicCostTypes_items_id", {
    name: "GET_api_v2_DynamicCostTypes_items_id",
    description: `This endpoint returns Process Definition items
(Tags: ProcessDefinitions)`,
    inputSchema: {"type":"object","properties":{"id":{"type":["string","null"]},"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/DynamicCostTypes/{id}/items",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["ProcessDefinitions"],
    deprecated: false
  }],
  ["GET_api_v2_ProcessInstances_id", {
    name: "GET_api_v2_ProcessInstances_id",
    description: `This endpoint returns Process Instances by ID
(Tags: ProcessInstances)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/ProcessInstances/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["ProcessInstances"],
    deprecated: false
  }],
  ["GET_api_v2_ProcessInstances_dataFields_id", {
    name: "GET_api_v2_ProcessInstances_dataFields_id",
    description: `This endpoint returns Process Instance data fields
(Tags: ProcessInstances)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/ProcessInstances/{id}/dataFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["ProcessInstances"],
    deprecated: false
  }],
  ["GET_api_v2_ProcessInstances_dynamicGrids_id", {
    name: "GET_api_v2_ProcessInstances_dynamicGrids_id",
    description: `This endpoint returns Process Instance dynamic grids
(Tags: ProcessInstances)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/ProcessInstances/{id}/dynamicGrids",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["ProcessInstances"],
    deprecated: false
  }],
  ["GET_api_v2_ProcessInstances_Comments_id", {
    name: "GET_api_v2_ProcessInstances_Comments_id",
    description: `This endpoint returns Process Instance comments
(Tags: ProcessInstances)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/ProcessInstances/{id}/Comments",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["ProcessInstances"],
    deprecated: false
  }],
  ["POST_api_v2_ProcessInstances_Comments_Create_id", {
    name: "POST_api_v2_ProcessInstances_Comments_Create_id",
    description: `This endpoint creates Process Instance comments
(Tags: ProcessInstances)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":""},"requestBody":{"type":"object","properties":{"commentText":{"type":"string"},"isPrivate":{"type":"boolean"},"documents":{"type":"array","items":{"type":"string"}}},"description":"The JSON request body."}},"required":["id"]},
    method: "post",
    pathTemplate: "/api/v2/ProcessInstances/{id}/Comments/Create",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["ProcessInstances"],
    deprecated: false
  }],
  ["GET_api_v2_ProcessInstances_dynamicGrids_id_dynamicGridId", {
    name: "GET_api_v2_ProcessInstances_dynamicGrids_id_dynamicGridId",
    description: `This endpoint returns Process Instances dynamic grid by ID
(Tags: ProcessInstances)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dynamicGridId":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id","dynamicGridId"]},
    method: "get",
    pathTemplate: "/api/v2/ProcessInstances/{id}/dynamicGrids/{dynamicGridId}",
    executionParameters: [{"name":"id","in":"path"},{"name":"dynamicGridId","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["ProcessInstances"],
    deprecated: false
  }],
  ["GET_api_v2_ProcessInstances_dynamicGrids_items_id_dynamicGridId", {
    name: "GET_api_v2_ProcessInstances_dynamicGrids_items_id_dynamicGridId",
    description: `This endpoint returns Process Instance dynamic grid items
(Tags: ProcessInstances)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dynamicGridId":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id","dynamicGridId"]},
    method: "get",
    pathTemplate: "/api/v2/ProcessInstances/{id}/dynamicGrids/{dynamicGridId}/items",
    executionParameters: [{"name":"id","in":"path"},{"name":"dynamicGridId","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["ProcessInstances"],
    deprecated: false
  }],
  ["GET_api_v2_DynamicCostItems_id", {
    name: "GET_api_v2_DynamicCostItems_id",
    description: `This endpoint returns Process Instance dynamic cost items by ID
(Tags: ProcessInstances)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/DynamicCostItems/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["ProcessInstances"],
    deprecated: false
  }],
  ["GET_api_v2_DynamicCostItems_customFields_id", {
    name: "GET_api_v2_DynamicCostItems_customFields_id",
    description: `This endpoint returns Process Instance dynamic cost item custom fields
(Tags: ProcessInstances)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/DynamicCostItems/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["ProcessInstances"],
    deprecated: false
  }],
  ["POST_api_v2_ProcessInstance_Attach_processInstanceId", {
    name: "POST_api_v2_ProcessInstance_Attach_processInstanceId",
    description: `This endpoint attaches Process Instances by instanceId
(Tags: ProcessInstances)`,
    inputSchema: {"type":"object","properties":{"processInstanceId":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}},"required":["processInstanceId"]},
    method: "post",
    pathTemplate: "/api/v2/ProcessInstance/{processInstanceId}/Attach",
    executionParameters: [{"name":"processInstanceId","in":"path"},{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["ProcessInstances"],
    deprecated: false
  }],
  ["GET_api_v2_Projects", {
    name: "GET_api_v2_Projects",
    description: `This endpoint returns Projects
(Tags: Projects)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/Projects",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Projects"],
    deprecated: false
  }],
  ["GET_api_v2_Projects_id", {
    name: "GET_api_v2_Projects_id",
    description: `This endpoint returns Projects by ID
(Tags: Projects)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Projects/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Projects"],
    deprecated: false
  }],
  ["GET_api_v2_Projects_customfields_id", {
    name: "GET_api_v2_Projects_customfields_id",
    description: `This endpoint returns Projects custom fields
(Tags: Projects)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Projects/{id}/customfields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Projects"],
    deprecated: false
  }],
  ["POST_api_v2_Projects_Import", {
    name: "POST_api_v2_Projects_Import",
    description: `This endpoint imports Project records
(Tags: Projects)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"schemaType":{"type":["string","null"],"default":"request"},"requestBody":{"type":"object","properties":{"options":{"type":"object"},"data":{"type":"array","items":{}}},"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/api/v2/Projects/Import",
    executionParameters: [{"name":"schema","in":"query"},{"name":"schemaType","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Projects"],
    deprecated: false
  }],
  ["POST_api_v2_Projects_Query", {
    name: "POST_api_v2_Projects_Query",
    description: `This endpoint returns Project records and related data
(Tags: Projects)`,
    inputSchema: {"type":"object","properties":{"schema":{"type":"boolean","default":false},"pageNumber":{"type":"number","format":"int32","default":0},"pageSize":{"type":"number","format":"int32","default":0},"requestBody":{"type":"object","properties":{"SelectedFields":{"type":"array","items":{"type":"string"}},"Filters":{"type":"array","items":{"type":"object","properties":{"Field":{"type":"string"},"Operation":{"type":"string"},"Value":{"type":"string"}}}},"AdvancedScript":{"type":"string"}},"description":"Query request containing filters, selected fields, and advanced script"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/Projects/Query",
    executionParameters: [{"name":"schema","in":"query"},{"name":"pageNumber","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Projects"],
    deprecated: false
  }],
  ["GET_api_v2_Schedules", {
    name: "GET_api_v2_Schedules",
    description: `This endpoint returns Schedules
(Tags: Schedules)`,
    inputSchema: {"type":"object","properties":{"dateCreated":{"type":["string","null"],"format":"date-time"},"lastUpdated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/Schedules",
    executionParameters: [{"name":"dateCreated","in":"query"},{"name":"lastUpdated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Schedules"],
    deprecated: false
  }],
  ["GET_api_v2_Schedules_id", {
    name: "GET_api_v2_Schedules_id",
    description: `This endpoint returns Schedules by ID
(Tags: Schedules)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Schedules/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Schedules"],
    deprecated: false
  }],
  ["GET_api_v2_Schedules_tasks_id", {
    name: "GET_api_v2_Schedules_tasks_id",
    description: `This endpoint returns Schedule tasks
(Tags: Schedules)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Schedules/{id}/tasks",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Schedules"],
    deprecated: false
  }],
  ["GET_api_v2_Schedules_customFields_id", {
    name: "GET_api_v2_Schedules_customFields_id",
    description: `This endpoint returns Schedule custom fields
(Tags: Schedules)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Schedules/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Schedules"],
    deprecated: false
  }],
  ["GET_api_v2_ScheduleTasks", {
    name: "GET_api_v2_ScheduleTasks",
    description: `This endpoint returns Schedule Tasks
(Tags: Schedules)`,
    inputSchema: {"type":"object","properties":{"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/ScheduleTasks",
    executionParameters: [{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Schedules"],
    deprecated: false
  }],
  ["GET_api_v2_ScheduleTasks_id", {
    name: "GET_api_v2_ScheduleTasks_id",
    description: `This endpoint returns Schedule Tasks by ID
(Tags: Schedules)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/ScheduleTasks/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Schedules"],
    deprecated: false
  }],
  ["GET_api_v2_ScheduleTasks_predecessors_id", {
    name: "GET_api_v2_ScheduleTasks_predecessors_id",
    description: `This endpoint returns Schedule Task predecessors
(Tags: Schedules)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/ScheduleTasks/{id}/predecessors",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Schedules"],
    deprecated: false
  }],
  ["GET_api_v2_ScheduleTasks_customFields_id", {
    name: "GET_api_v2_ScheduleTasks_customFields_id",
    description: `This endpoint returns Schedule Task custom fields
(Tags: Schedules)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/ScheduleTasks/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Schedules"],
    deprecated: false
  }],
  ["GET_api_v2_SubmittalPackages", {
    name: "GET_api_v2_SubmittalPackages",
    description: `This endpoint returns Submittal Package records
(Tags: Submittals)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/SubmittalPackages",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Submittals"],
    deprecated: false
  }],
  ["GET_api_v2_SubmittalPackages_id", {
    name: "GET_api_v2_SubmittalPackages_id",
    description: `This endpoint returns Submittal Package records by Id
(Tags: Submittals)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/SubmittalPackages/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Submittals"],
    deprecated: false
  }],
  ["GET_api_v2_SubmittalPackages_items_id", {
    name: "GET_api_v2_SubmittalPackages_items_id",
    description: `This endpoint returns Submittal Package Item records
(Tags: Submittals)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/SubmittalPackages/{id}/items",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Submittals"],
    deprecated: false
  }],
  ["GET_api_v2_SubmittalPackages_customFields_id", {
    name: "GET_api_v2_SubmittalPackages_customFields_id",
    description: `This endpoint returns Submittal Package Custom Field records
(Tags: Submittals)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/SubmittalPackages/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Submittals"],
    deprecated: false
  }],
  ["GET_api_v2_SubmittalItems", {
    name: "GET_api_v2_SubmittalItems",
    description: `This endpoint returns Submittal Item records
(Tags: Submittals)`,
    inputSchema: {"type":"object","properties":{"dateModified":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/SubmittalItems",
    executionParameters: [{"name":"dateModified","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Submittals"],
    deprecated: false
  }],
  ["GET_api_v2_SubmittalItems_id", {
    name: "GET_api_v2_SubmittalItems_id",
    description: `This endpoint returns Submittal Item records by Id
(Tags: Submittals)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/SubmittalItems/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Submittals"],
    deprecated: false
  }],
  ["GET_api_v2_SubmittalItems_reviewers_id", {
    name: "GET_api_v2_SubmittalItems_reviewers_id",
    description: `This endpoint returns Submittal Item Reviewer records
(Tags: Submittals)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"dateDue":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/SubmittalItems/{id}/reviewers",
    executionParameters: [{"name":"id","in":"path"},{"name":"dateDue","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Submittals"],
    deprecated: false
  }],
  ["GET_api_v2_SubmittalItems_customFields_id", {
    name: "GET_api_v2_SubmittalItems_customFields_id",
    description: `This endpoint returns Submittal Item Custom Field records
(Tags: Submittals)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/SubmittalItems/{id}/customFields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Submittals"],
    deprecated: false
  }],
  ["GET_api_v2_Users", {
    name: "GET_api_v2_Users",
    description: `This endpoint returns User records
(Tags: Users)`,
    inputSchema: {"type":"object","properties":{"dateCreated":{"type":["string","null"],"format":"date-time"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}}},
    method: "get",
    pathTemplate: "/api/v2/Users",
    executionParameters: [{"name":"dateCreated","in":"query"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Users"],
    deprecated: false
  }],
  ["GET_api_v2_Users_id", {
    name: "GET_api_v2_Users_id",
    description: `This endpoint returns User records by Id
(Tags: Users)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Users/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Users"],
    deprecated: false
  }],
  ["GET_api_v2_Users_customfields_id", {
    name: "GET_api_v2_Users_customfields_id",
    description: `This endpoint returns User Custom Field records
(Tags: Users)`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"guid"},"limit":{"type":"number","format":"int32"},"offset":{"type":"number","format":"int32"},"schema":{"type":"boolean","default":false}},"required":["id"]},
    method: "get",
    pathTemplate: "/api/v2/Users/{id}/customfields",
    executionParameters: [{"name":"id","in":"path"},{"name":"limit","in":"query"},{"name":"offset","in":"query"},{"name":"schema","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Users"],
    deprecated: false
  }],
  ["POST_api_v2_Authenticate", {
    name: "POST_api_v2_Authenticate",
    description: `Returns a JWT bearer token.
(Tags: Authenticate)`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"string","description":"Request body (content type: application/x-www-form-urlencoded)"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/api/v2/Authenticate",
    executionParameters: [],
    requestBodyContentType: "application/x-www-form-urlencoded",
    securityRequirements: [{"PasswordFlow":[]}],
    tags: ["Authenticate"],
    deprecated: false
  }],
]);

/**
 * Security schemes from the OpenAPI spec
 */
const securitySchemes =   {
    "PasswordFlow": {
      "type": "oauth2",
      "description": "Enter your username and password; Swagger-UI takes care of the rest.",
      "flows": {
        "password": {
          "tokenUrl": "/api/v2/Authenticate",
          "scopes": {
            "default": "Full API access"
          }
        }
      }
    }
  };


server.setRequestHandler(ListToolsRequestSchema, async () => {
  const toolsForClient: Tool[] = Array.from(toolDefinitionMap.values()).map(def => ({
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema
  }));
  return { tools: toolsForClient };
});


server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
  const { name: toolName, arguments: toolArgs } = request.params;
  const toolDefinition = toolDefinitionMap.get(toolName);
  if (!toolDefinition) {
    console.error(`Error: Unknown tool requested: ${toolName}`);
    return { content: [{ type: "text", text: `Error: Unknown tool requested: ${toolName}` }] };
  }
  return await executeApiTool(toolName, toolDefinition, toolArgs ?? {}, securitySchemes);
});



/**
 * Type definition for cached OAuth tokens
 */
interface TokenCacheEntry {
    token: string;
    expiresAt: number;
}

/**
 * Declare global __oauthTokenCache property for TypeScript
 */
declare global {
    var __oauthTokenCache: Record<string, TokenCacheEntry> | undefined;
}

/**
 * Acquires an OAuth2 token using client credentials flow
 * 
 * @param schemeName Name of the security scheme
 * @param scheme OAuth2 security scheme
 * @returns Acquired token or null if unable to acquire
 */
async function acquireOAuth2Token(schemeName: string, scheme: any): Promise<string | null | undefined> {
    try {
        // Check if we have the necessary credentials (resolved per-scheme at runtime)
        const clientId = process.env[`OAUTH_CLIENT_ID_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
        const clientSecret = process.env[`OAUTH_CLIENT_SECRET_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
        const scopes = process.env[`OAUTH_SCOPES_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];

        if (!clientId || !clientSecret) {
            console.error(`Missing client credentials for OAuth2 scheme '${schemeName}'`);
            return null;
        }
        
        // Initialize token cache if needed
        if (typeof global.__oauthTokenCache === 'undefined') {
            global.__oauthTokenCache = {};
        }
        
        // Check if we have a cached token
        const cacheKey = `${schemeName}_${clientId}`;
        const cachedToken = global.__oauthTokenCache[cacheKey];
        const now = Date.now();
        
        if (cachedToken && cachedToken.expiresAt > now) {
            console.error(`Using cached OAuth2 token for '${schemeName}' (expires in ${Math.floor((cachedToken.expiresAt - now) / 1000)} seconds)`);
            return cachedToken.token;
        }
        
        // Determine token URL based on flow type
        let tokenUrl = '';
        if (scheme.flows?.clientCredentials?.tokenUrl) {
            tokenUrl = scheme.flows.clientCredentials.tokenUrl;
            console.error(`Using client credentials flow for '${schemeName}'`);
        } else if (scheme.flows?.password?.tokenUrl) {
            tokenUrl = scheme.flows.password.tokenUrl;
            console.error(`Using password flow for '${schemeName}'`);
        } else {
            console.error(`No supported OAuth2 flow found for '${schemeName}'`);
            return null;
        }
        
        // Prepare the token request
        let formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');
        
        // Add scopes if specified
        if (scopes) {
            formData.append('scope', scopes);
        }

        console.error(`Requesting OAuth2 token from ${tokenUrl}`);

        // Make the token request
        const response = await axios({
            method: 'POST',
            url: tokenUrl,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            data: formData.toString()
        });
        
        // Process the response
        if (response.data?.access_token) {
            const token = response.data.access_token;
            const expiresIn = response.data.expires_in || 3600; // Default to 1 hour
            
            // Cache the token
            global.__oauthTokenCache[cacheKey] = {
                token,
                expiresAt: now + (expiresIn * 1000) - 60000 // Expire 1 minute early
            };
            
            console.error(`Successfully acquired OAuth2 token for '${schemeName}' (expires in ${expiresIn} seconds)`);
            return token;
        } else {
            console.error(`Failed to acquire OAuth2 token for '${schemeName}': No access_token in response`);
            return null;
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error acquiring OAuth2 token for '${schemeName}':`, errorMessage);
        return null;
    }
}


/**
 * Executes an API tool with the provided arguments
 * 
 * @param toolName Name of the tool to execute
 * @param definition Tool definition
 * @param toolArgs Arguments provided by the user
 * @param allSecuritySchemes Security schemes from the OpenAPI spec
 * @returns Call tool result
 */
async function executeApiTool(
    toolName: string,
    definition: McpToolDefinition,
    toolArgs: JsonObject,
    allSecuritySchemes: Record<string, any>
): Promise<CallToolResult> {
  try {
    // Validate arguments against the input schema
    let validatedArgs: JsonObject;
    try {
        const zodSchema = getZodSchemaFromJsonSchema(definition.inputSchema, toolName);
        const argsToParse = (typeof toolArgs === 'object' && toolArgs !== null) ? toolArgs : {};
        validatedArgs = zodSchema.parse(argsToParse);
    } catch (error: unknown) {
        if (error instanceof ZodError) {
            const validationErrorMessage = `Invalid arguments for tool '${toolName}': ${error.errors.map(e => `${e.path.join('.')} (${e.code}): ${e.message}`).join(', ')}`;
            return { content: [{ type: 'text', text: validationErrorMessage }] };
        } else {
             const errorMessage = error instanceof Error ? error.message : String(error);
             return { content: [{ type: 'text', text: `Internal error during validation setup: ${errorMessage}` }] };
        }
    }

    // Prepare URL, query parameters, headers, and request body
    let urlPath = definition.pathTemplate;
    const queryParams: Record<string, any> = {};
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    let requestBodyData: any = undefined;

    // Apply parameters to the URL path, query, or headers
    definition.executionParameters.forEach((param) => {
        const value = validatedArgs[param.name];
        if (typeof value !== 'undefined' && value !== null) {
            if (param.in === 'path') {
                urlPath = urlPath.replace(`{${param.name}}`, encodeURIComponent(String(value)));
            }
            else if (param.in === 'query') {
                queryParams[param.name] = value;
            }
            else if (param.in === 'header') {
                headers[param.name.toLowerCase()] = String(value);
            }
        }
    });

    // Ensure all path parameters are resolved
    if (urlPath.includes('{')) {
        throw new Error(`Failed to resolve path parameters: ${urlPath}`);
    }
    
    // Construct the full URL
    const requestUrl = API_BASE_URL ? `${API_BASE_URL}${urlPath}` : urlPath;

    // Handle request body if needed
    if (definition.requestBodyContentType && typeof validatedArgs['requestBody'] !== 'undefined') {
        requestBodyData = validatedArgs['requestBody'];
        headers['content-type'] = definition.requestBodyContentType;
    }

    // Apply security requirements if available
    // Security requirements use OR between array items and AND within each object
    const appliedSecurity = definition.securityRequirements?.find(req => {
        // Try each security requirement (combined with OR)
        return Object.entries(req).every(([schemeName, scopesArray]) => {
            const scheme = allSecuritySchemes[schemeName];
            if (!scheme) return false;
            
            // API Key security (header, query, cookie)
            if (scheme.type === 'apiKey') {
                return !!process.env[`API_KEY_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
            }
            
            // HTTP security (basic, bearer)
            if (scheme.type === 'http') {
                if (scheme.scheme?.toLowerCase() === 'bearer') {
                    return !!process.env[`BEARER_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                }
                else if (scheme.scheme?.toLowerCase() === 'basic') {
                    // Username is sufficient; an empty password is valid per RFC 7617 (issue #66)
                    return process.env[`BASIC_USERNAME_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`] != null;
                }
            }
            
            // OAuth2 security
            if (scheme.type === 'oauth2') {
                // Check for pre-existing token
                if (process.env[`OAUTH_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`]) {
                    return true;
                }
                
                // Check for client credentials for auto-acquisition
                if (process.env[`OAUTH_CLIENT_ID_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`] &&
                    process.env[`OAUTH_CLIENT_SECRET_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`]) {
                    // Verify we have a supported flow
                    if (scheme.flows?.clientCredentials || scheme.flows?.password) {
                        return true;
                    }
                }
                
                return false;
            }
            
            // OpenID Connect
            if (scheme.type === 'openIdConnect') {
                return !!process.env[`OPENID_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
            }
            
            return false;
        });
    });

    // If we found matching security scheme(s), apply them
    if (appliedSecurity) {
        // Apply each security scheme from this requirement (combined with AND)
        for (const [schemeName, scopesArray] of Object.entries(appliedSecurity)) {
            const scheme = allSecuritySchemes[schemeName];
            
            // API Key security
            if (scheme?.type === 'apiKey') {
                const apiKey = process.env[`API_KEY_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                if (apiKey) {
                    if (scheme.in === 'header') {
                        headers[scheme.name.toLowerCase()] = apiKey;
                        console.error(`Applied API key '${schemeName}' in header '${scheme.name}'`);
                    }
                    else if (scheme.in === 'query') {
                        queryParams[scheme.name] = apiKey;
                        console.error(`Applied API key '${schemeName}' in query parameter '${scheme.name}'`);
                    }
                    else if (scheme.in === 'cookie') {
                        // Add the cookie, preserving other cookies if they exist
                        headers['cookie'] = `${scheme.name}=${apiKey}${headers['cookie'] ? `; ${headers['cookie']}` : ''}`;
                        console.error(`Applied API key '${schemeName}' in cookie '${scheme.name}'`);
                    }
                }
            } 
            // HTTP security (Bearer or Basic)
            else if (scheme?.type === 'http') {
                if (scheme.scheme?.toLowerCase() === 'bearer') {
                    const token = process.env[`BEARER_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    if (token) {
                        headers['authorization'] = `Bearer ${token}`;
                        console.error(`Applied Bearer token for '${schemeName}'`);
                    }
                } 
                else if (scheme.scheme?.toLowerCase() === 'basic') {
                    const username = process.env[`BASIC_USERNAME_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    const password = process.env[`BASIC_PASSWORD_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    // Empty password is valid per RFC 7617 (issue #66); only username is required.
                    if (username != null) {
                        headers['authorization'] = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
                        console.error(`Applied Basic authentication for '${schemeName}'`);
                    }
                }
            }
            // OAuth2 security
            else if (scheme?.type === 'oauth2') {
                // First try to use a pre-provided token
                let token = process.env[`OAUTH_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                
                // If no token but we have client credentials, try to acquire a token
                if (!token && (scheme.flows?.clientCredentials || scheme.flows?.password)) {
                    console.error(`Attempting to acquire OAuth token for '${schemeName}'`);
                    token = (await acquireOAuth2Token(schemeName, scheme)) ?? '';
                }
                
                // Apply token if available
                if (token) {
                    headers['authorization'] = `Bearer ${token}`;
                    console.error(`Applied OAuth2 token for '${schemeName}'`);
                    
                    // List the scopes that were requested, if any
                    const scopes = scopesArray as string[];
                    if (scopes && scopes.length > 0) {
                        console.error(`Requested scopes: ${scopes.join(', ')}`);
                    }
                }
            }
            // OpenID Connect
            else if (scheme?.type === 'openIdConnect') {
                const token = process.env[`OPENID_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                if (token) {
                    headers['authorization'] = `Bearer ${token}`;
                    console.error(`Applied OpenID Connect token for '${schemeName}'`);
                    
                    // List the scopes that were requested, if any
                    const scopes = scopesArray as string[];
                    if (scopes && scopes.length > 0) {
                        console.error(`Requested scopes: ${scopes.join(', ')}`);
                    }
                }
            }
        }
    } 
    // Log warning if security is required but not available
    else if (definition.securityRequirements?.length > 0) {
        // First generate a more readable representation of the security requirements
        const securityRequirementsString = definition.securityRequirements
            .map(req => {
                const parts = Object.entries(req)
                    .map(([name, scopesArray]) => {
                        const scopes = scopesArray as string[];
                        if (scopes.length === 0) return name;
                        return `${name} (scopes: ${scopes.join(', ')})`;
                    })
                    .join(' AND ');
                return `[${parts}]`;
            })
            .join(' OR ');
            
        console.warn(`Tool '${toolName}' requires security: ${securityRequirementsString}, but no suitable credentials found.`);
    }
    

    // Prepare the axios request configuration
    const config: AxiosRequestConfig = {
      method: definition.method.toUpperCase(),
      url: requestUrl,
      params: queryParams,
      headers: headers,
      // Serialize array query params as comma-separated values (issue #41)
      paramsSerializer: (params: Record<string, any>) => {
        const search = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          if (value === undefined || value === null) continue;
          search.append(key, Array.isArray(value) ? value.join(',') : String(value));
        }
        return search.toString();
      },
      ...(requestBodyData !== undefined && { data: requestBodyData }),
    };

    // Log request info to stderr (doesn't affect MCP output)
    console.error(`Executing tool "${toolName}": ${config.method} ${config.url}`);

    // Execute the request
    const response = await axios(config);

    // Process and format the response
    let responseText = '';
    // Coerce header value to string before lowercasing (issue #65)
    const contentType = String(response.headers['content-type'] ?? '').toLowerCase();
    
    // Handle JSON responses
    if (contentType.includes('application/json') && typeof response.data === 'object' && response.data !== null) {
         try { 
             responseText = JSON.stringify(response.data, null, 2); 
         } catch (e) { 
             responseText = "[Stringify Error]"; 
         }
    } 
    // Handle string responses
    else if (typeof response.data === 'string') { 
         responseText = response.data; 
    }
    // Handle other response types
    else if (response.data !== undefined && response.data !== null) { 
         responseText = String(response.data); 
    }
    // Handle empty responses
    else { 
         responseText = `(Status: ${response.status} - No body content)`; 
    }
    
    // Return formatted response
    return { 
        content: [ 
            { 
                type: "text", 
                text: `API Response (Status: ${response.status}):\n${responseText}` 
            } 
        ], 
    };

  } catch (error: unknown) {
    // Handle errors during execution
    let errorMessage: string;
    
    // Format Axios errors specially
    if (axios.isAxiosError(error)) { 
        errorMessage = formatApiError(error); 
    }
    // Handle standard errors
    else if (error instanceof Error) { 
        errorMessage = error.message; 
    }
    // Handle unexpected error types
    else { 
        errorMessage = 'Unexpected error: ' + String(error); 
    }
    
    // Log error to stderr
    console.error(`Error during execution of tool '${toolName}':`, errorMessage);
    
    // Return error message to client
    return { content: [{ type: "text", text: errorMessage }] };
  }
}


/**
 * Main function to start the server
 */
async function main() {
// Set up stdio transport
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`${SERVER_NAME} MCP Server (v${SERVER_VERSION}) running on stdio${API_BASE_URL ? `, proxying API at ${API_BASE_URL}` : ''}`);
  } catch (error) {
    console.error("Error during server startup:", error);
    process.exit(1);
  }
}

/**
 * Cleanup function for graceful shutdown
 */
async function cleanup() {
    console.error("Shutting down MCP server...");
    process.exit(0);
}

// Register signal handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the server
main().catch((error) => {
  console.error("Fatal error in main execution:", error);
  process.exit(1);
});

/**
 * Formats API errors for better readability
 * 
 * @param error Axios error
 * @returns Formatted error message
 */
function formatApiError(error: AxiosError): string {
    let message = 'API request failed.';
    if (error.response) {
        message = `API Error: Status ${error.response.status} (${error.response.statusText || 'Status text not available'}). `;
        const responseData = error.response.data;
        const MAX_LEN = 200;
        if (typeof responseData === 'string') { 
            message += `Response: ${responseData.substring(0, MAX_LEN)}${responseData.length > MAX_LEN ? '...' : ''}`; 
        }
        else if (responseData) { 
            try { 
                const jsonString = JSON.stringify(responseData); 
                message += `Response: ${jsonString.substring(0, MAX_LEN)}${jsonString.length > MAX_LEN ? '...' : ''}`; 
            } catch { 
                message += 'Response: [Could not serialize data]'; 
            } 
        }
        else { 
            message += 'No response body received.'; 
        }
    } else if (error.request) {
        message = 'API Network Error: No response received from server.';
        if (error.code) message += ` (Code: ${error.code})`;
    } else { 
        message += `API Request Setup Error: ${error.message}`; 
    }
    return message;
}

/**
 * Converts a JSON Schema to a Zod schema for runtime validation
 * 
 * @param jsonSchema JSON Schema
 * @param toolName Tool name for error reporting
 * @returns Zod schema
 */
function getZodSchemaFromJsonSchema(jsonSchema: any, toolName: string): z.ZodTypeAny {
    if (typeof jsonSchema !== 'object' || jsonSchema === null) { 
        return z.object({}).passthrough(); 
    }
    try {
        const zodSchemaString = jsonSchemaToZod(jsonSchema);
        const zodSchema = eval(zodSchemaString);
        if (typeof zodSchema?.parse !== 'function') { 
            throw new Error('Eval did not produce a valid Zod schema.'); 
        }
        return zodSchema as z.ZodTypeAny;
    } catch (err: any) {
        console.error(`Failed to generate/evaluate Zod schema for '${toolName}':`, err);
        return z.object({}).passthrough();
    }
}
