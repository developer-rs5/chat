const express = require("express");
const path = require("path");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());


// Base URL for Cloudflare API
const CF_API_BASE = "https://api.cloudflare.com/client/v4";

// Helper function for Cloudflare API calls
async function callCloudflareAPI(endpoint, method = "GET", data = null, token = null) {
  try {
    const config = {
      method: method,
      url: `${CF_API_BASE}${endpoint}`,
      headers: {
        "Authorization": `Bearer ${token || CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json"
      }
    };
    if (data) {
      config.data = data;
    }
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error("Cloudflare API Error:", error.response?.data || error.message);
    throw error;
  }
}

// Validate domain name
function isValidDomain(domain) {
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

// Validate subdomain
function isValidSubdomain(subdomain) {
  const subdomainRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  return subdomainRegex.test(subdomain);
}

// Get the ruleset ID
async function getRulesetId(token) {
  try {
    const result = await callCloudflareAPI(
      `/zones/${ZONE_ID}/rulesets/phases/http_request_firewall_custom/entrypoint`,
      "GET",
      null,
      token
    );

    if (result.success && result.result && result.result.id) {
      return result.result.id;
    }

    return null;
  } catch (error) {
    console.error("Error getting ruleset:", error);
    return null;
  }
}

// Create a new ruleset if none exists
async function createRuleset(token) {
  try {
    const createResult = await callCloudflareAPI(
      `/zones/${ZONE_ID}/rulesets`,
      "POST",
      {
        "name": "zone",
        "description": "Zone-level phase entry point",
        "kind": "zone",
        "phase": "http_request_firewall_custom",
        "rules": []
      },
      token
    );

    if (createResult.success && createResult.result && createResult.result.id) {
      return createResult.result.id;
    }

    throw new Error("Failed to create ruleset");
  } catch (error) {
    console.error("Error creating ruleset:", error);
    throw error;
  }
}

// Get or create the entry-point ruleset
async function getOrCreateRuleset(token) {
  try {
    const rulesetId = await getRulesetId(token);
    if (rulesetId) {
      return rulesetId;
    }
    return await createRuleset(token);
  } catch (error) {
    console.error("Error getting/creating ruleset:", error);
    throw error;
  }
}

// ---------- CLOUDFLARE DOMAIN ROUTES ----------

// Get all domains (DNS records)
app.post("/api/cloudflare/domains", async (req, res) => {
  try {
    const { token, zoneId } = req.body;
    const targetZone = zoneId || ZONE_ID;

    const result = await callCloudflareAPI(
      `/zones/${targetZone}/dns_records`,
      "GET",
      null,
      token
    );

    if (result.success && result.result) {
      res.json({ success: true, domains: result.result });
    } else {
      res.json({ success: false, error: "Failed to fetch domains" });
    }
  } catch (error) {
    console.error("Error fetching domains:", error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.errors?.[0]?.message || error.message
    });
  }
});

// Create a new domain (DNS record)
app.post("/api/cloudflare/domains/create", async (req, res) => {
  try {
    const { token, zoneId, type, name, content, proxied, ttl } = req.body;
    const targetZone = zoneId || ZONE_ID;

    let fullDomain = name;
    if (!isValidDomain(name)) {
      if (isValidSubdomain(name)) {
        const zoneResult = await callCloudflareAPI(
          `/zones/${targetZone}`,
          "GET",
          null,
          token
        );
        if (zoneResult.success && zoneResult.result) {
          const zoneName = zoneResult.result.name;
          fullDomain = `${name}.${zoneName}`;
        } else {
          throw new Error("Failed to get zone information");
        }
      } else {
        throw new Error("Invalid domain or subdomain name");
      }
    }

    const result = await callCloudflareAPI(
      `/zones/${targetZone}/dns_records`,
      "POST",
      {
        type: type || "A",
        name: fullDomain,
        content: content || "192.168.1.1",
        ttl: ttl || 120,
        proxied: proxied !== undefined ? proxied : true
      },
      token
    );

    if (result.success && result.result) {
      res.json({ success: true, domain: result.result });
    } else {
      const errorMsg = result.errors?.[0]?.message || "Failed to create domain";
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error("Error creating domain:", error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.errors?.[0]?.message || error.message
    });
  }
});

// Update domain (DNS record)
app.put("/api/cloudflare/domains/update/:id", async (req, res) => {
  try {
    const { token, zoneId, type, name, content, proxied, ttl } = req.body;
    const { id } = req.params;
    const targetZone = zoneId || ZONE_ID;

    let fullDomain = name;
    if (!isValidDomain(name)) {
      if (isValidSubdomain(name)) {
        const zoneResult = await callCloudflareAPI(
          `/zones/${targetZone}`,
          "GET",
          null,
          token
        );
        if (zoneResult.success && zoneResult.result) {
          const zoneName = zoneResult.result.name;
          fullDomain = `${name}.${zoneName}`;
        } else {
          throw new Error("Failed to get zone information");
        }
      } else {
        throw new Error("Invalid domain or subdomain name");
      }
    }

    const result = await callCloudflareAPI(
      `/zones/${targetZone}/dns_records/${id}`,
      "PUT",
      {
        type: type || "A",
        name: fullDomain,
        content: content,
        ttl: ttl || 120,
        proxied: proxied !== undefined ? proxied : true
      },
      token
    );

    if (result.success && result.result) {
      res.json({ success: true, domain: result.result });
    } else {
      throw new Error(result.errors?.[0]?.message || "Failed to update domain");
    }
  } catch (error) {
    console.error("Error updating domain:", error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.errors?.[0]?.message || error.message
    });
  }
});

// Delete domain (DNS record)
app.delete("/api/cloudflare/domains/delete/:id", async (req, res) => {
  try {
    const { token, zoneId } = req.body;
    const { id } = req.params;
    const targetZone = zoneId || ZONE_ID;

    const result = await callCloudflareAPI(
      `/zones/${targetZone}/dns_records/${id}`,
      "DELETE",
      null,
      token
    );

    if (result.success) {
      res.json({ success: true });
    } else {
      throw new Error("Failed to delete domain");
    }
  } catch (error) {
    console.error("Error deleting domain:", error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.errors?.[0]?.message || error.message
    });
  }
});

// Toggle Cloudflare proxy for a domain
app.patch("/api/cloudflare/domains/toggle-proxy/:id", async (req, res) => {
  try {
    const { token, zoneId, proxied } = req.body;
    const { id } = req.params;
    const targetZone = zoneId || ZONE_ID;

    const getResult = await callCloudflareAPI(
      `/zones/${targetZone}/dns_records/${id}`,
      "GET",
      null,
      token
    );

    if (!getResult.success || !getResult.result) {
      throw new Error("Failed to fetch domain record");
    }

    const record = getResult.result;

    const result = await callCloudflareAPI(
      `/zones/${targetZone}/dns_records/${id}`,
      "PUT",
      {
        type: record.type,
        name: record.name,
        content: record.content,
        ttl: record.ttl || 120,
        proxied: proxied !== undefined ? proxied : true
      },
      token
    );

    if (result.success && result.result) {
      res.json({ success: true, domain: result.result });
    } else {
      throw new Error("Failed to update proxy setting");
    }
  } catch (error) {
    console.error("Error toggling proxy:", error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.errors?.[0]?.message || error.message
    });
  }
});

// ---------- BLOCK RULES ROUTES ----------

// Get current block rules
app.post("/api/cloudflare/blocks/list", async (req, res) => {
  try {
    const { token, zoneId } = req.body;
    const targetZone = zoneId || ZONE_ID;

    const rulesetId = await getOrCreateRuleset(token);

    if (!rulesetId) {
      return res.json({ success: false, rules: [], error: "No ruleset found" });
    }

    const result = await callCloudflareAPI(
      `/zones/${targetZone}/rulesets/${rulesetId}`,
      "GET",
      null,
      token
    );

    if (result.success && result.result) {
      const rules = result.result.rules || [];
      const blockRules = rules.filter(rule => rule.action === "block");
      res.json({ success: true, rules: blockRules });
    } else {
      res.json({ success: false, rules: [], error: "Failed to fetch rules" });
    }
  } catch (error) {
    console.error("Error fetching block rules:", error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.errors?.[0]?.message || error.message
    });
  }
});

// Add a new block rule
app.post("/api/cloudflare/blocks/add", async (req, res) => {
  try {
    const { token, zoneId, type, value, reason } = req.body;
    const targetZone = zoneId || ZONE_ID;

    let expression = "";
    let description = reason || `Blocked ${value}`;

    switch (type) {
      case "country":
        expression = `(ip.src.country eq "${value.toUpperCase()}")`;
        description = `Country Block - ${value}`;
        break;
      case "ip":
        expression = `(ip.src.ip eq "${value}")`;
        description = `IP Block - ${value}`;
        break;
      case "isp":
        expression = `(ip.src.asnum eq "${value}")`;
        description = `ISP Block - ${value}`;
        break;
      case "region":
        expression = `(ip.src.country eq "${value.toUpperCase()}")`;
        description = `Region Block - ${value}`;
        break;
      default:
        return res.status(400).json({ success: false, error: "Invalid block type" });
    }

    const rulesetId = await getOrCreateRuleset(token);

    const result = await callCloudflareAPI(
      `/zones/${targetZone}/rulesets/${rulesetId}/rules`,
      "POST",
      {
        description: description,
        expression: expression,
        action: "block",
        enabled: true
      },
      token
    );

    if (result.success && result.result) {
      res.json({
        success: true,
        rule: {
          _id: result.result.id,
          type: type,
          value: value,
          reason: description,
          enabled: true,
          expression: expression
        }
      });
    } else {
      throw new Error(result.errors?.[0]?.message || "Failed to create block rule");
    }
  } catch (error) {
    console.error("Error adding block rule:", error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.errors?.[0]?.message || error.message
    });
  }
});

// Remove a block rule
app.post("/api/cloudflare/blocks/remove", async (req, res) => {
  try {
    const { token, zoneId, ruleId } = req.body;
    const targetZone = zoneId || ZONE_ID;

    if (!ruleId) {
      return res.status(400).json({ success: false, error: "Rule ID is required" });
    }

    const rulesetId = await getOrCreateRuleset(token);

    const result = await callCloudflareAPI(
      `/zones/${targetZone}/rulesets/${rulesetId}/rules/${ruleId}`,
      "DELETE",
      null,
      token
    );

    if (result.success) {
      res.json({ success: true });
    } else {
      throw new Error(result.errors?.[0]?.message || "Failed to delete block rule");
    }
  } catch (error) {
    console.error("Error removing block rule:", error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.errors?.[0]?.message || error.message
    });
  }
});

// Toggle block rule
app.patch("/api/cloudflare/blocks/toggle/:id", async (req, res) => {
  try {
    const { token, zoneId, enabled } = req.body;
    const { id } = req.params;
    const targetZone = zoneId || ZONE_ID;

    const rulesetId = await getOrCreateRuleset(token);

    const result = await callCloudflareAPI(
      `/zones/${targetZone}/rulesets/${rulesetId}/rules/${id}`,
      "PATCH",
      { enabled: enabled !== undefined ? enabled : false },
      token
    );

    if (result.success && result.result) {
      res.json({
        success: true,
        rule: {
          _id: result.result.id,
          enabled: result.result.enabled !== false
        }
      });
    } else {
      throw new Error(result.errors?.[0]?.message || "Failed to toggle rule");
    }
  } catch (error) {
    console.error("Error toggling rule:", error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.errors?.[0]?.message || error.message
    });
  }
});

// ---------- ANALYTICS ROUTES (using Zenuxs token) ----------

// Forward analytics requests to hostapi with Zenuxs token
app.post("/analytics/stats", async (req, res) => {
  try {
    const { token, serverId, timeRange } = req.body;
    const response = await axios.post("https://hostapi.zenuxs.in/analytics/stats", {
      token: token, // Zenuxs token
      serverId: serverId,
      timeRange: timeRange || "24h"
    });
    res.json(response.data);
  } catch (error) {
    console.error("Analytics proxy error:", error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message
    });
  }
});

// Get server info with Zenuxs token
app.post("/server/get", async (req, res) => {
  try {
    const { token, serverId } = req.body;
    const response = await axios.post("https://hostapi.zenuxs.in/server/get", {
      token: token,
      serverId: serverId
    });
    res.json(response.data);
  } catch (error) {
    console.error("Server get proxy error:", error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message
    });
  }
});

// Update server info with Zenuxs token
app.post("/server/update", async (req, res) => {
  try {
    const { token, serverId, data } = req.body;
    const response = await axios.post("https://hostapi.zenuxs.in/server/update", {
      token: token,
      serverId: serverId,
      data: data
    });
    res.json(response.data);
  } catch (error) {
    console.error("Server update proxy error:", error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message
    });
  }
});

// Serve static files
app.use(express.static("public"));

// // Serve the main HTML file
// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "index.html"));
// });


app.get("/status", (req, res) => {
  res.json({
    status: "online",
    cloudflare: "connected",
    version: "2.0.0"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Cloudflare API integration ready");
  console.log("Zone ID:", ZONE_ID);
});
