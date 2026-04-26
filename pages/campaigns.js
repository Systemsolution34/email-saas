"use client";

import { useEffect, useState } from "react";

export default function Campaigns() {
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState("");
  const [status, setStatus] = useState("");

  const [campaignList, setCampaignList] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  // Load campaigns
  const fetchCampaigns = async () => {
    const res = await fetch("/api/get-campaigns");
    const data = await res.json();
    setCampaignList(data.data || []);
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Create campaign
  const handleCreateCampaign = async () => {
    setStatus("Creating campaign...");

    const res = await fetch("/api/create-campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignName,
        subject,
        body,
        recipients,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setStatus("Campaign created ✅");

      // refresh list
      fetchCampaigns();

      // clear inputs
      setCampaignName("");
      setSubject("");
      setBody("");
      setRecipients("");
    } else {
      setStatus("Error: " + data.error);
    }
  };

  // Send campaign
  const sendCampaign = async (campaignId) => {
    setLoadingId(campaignId);

    try {
      const res = await fetch("/api/send-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });

      const data = await res.json();

      alert(data.success ? "Emails sent ✅" : data.error || "Failed");

      fetchCampaigns();
    } catch (err) {
      alert("Error sending campaign ❌");
    }

    setLoadingId(null);
  };

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Create New Campaign</h1>

      {/* CREATE FORM */}
      <input
        placeholder="Campaign Name"
        value={campaignName}
        onChange={(e) => setCampaignName(e.target.value)}
        style={{ width: "100%", marginBottom: 10, padding: 10 }}
      />

      <input
        placeholder="Email Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        style={{ width: "100%", marginBottom: 10, padding: 10 }}
      />

      <textarea
        placeholder="Email Body (HTML)"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        style={{ width: "100%", marginBottom: 10, padding: 10 }}
      />

      <textarea
        placeholder="Recipients (comma separated emails)"
        value={recipients}
        onChange={(e) => setRecipients(e.target.value)}
        style={{ width: "100%", marginBottom: 10, padding: 10 }}
      />

      <button onClick={handleCreateCampaign} style={{ padding: 10 }}>
        Create Campaign
      </button>

      <p>{status}</p>

      <hr style={{ margin: "40px 0" }} />

      {/* CAMPAIGN LIST */}
      <h2>Existing Campaigns</h2>

      {campaignList.length === 0 && <p>No campaigns yet</p>}

      {campaignList.map((c) => (
        <div
          key={c.id}
          style={{
            border: "1px solid #ddd",
            padding: 15,
            marginBottom: 10,
          }}
        >
          <h3>{c.name}</h3>
          <p>{c.subject}</p>
          <p>Status: {c.status}</p>

          <button
            onClick={() => sendCampaign(c.id)}
            disabled={loadingId === c.id}
            style={{ padding: 8 }}
          >
            {loadingId === c.id ? "Sending..." : "Send Campaign"}
          </button>
        </div>
      ))}
    </div>
  );
}