'use client';

import { useState } from 'react';

export default function TestAuditPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const createAudit = async () => {
    setLoading(true);
    setResult('Creating audit...');
    
    try {
      const response = await fetch('/api/audit/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateStart: new Date(Date.now() - 30*24*60*60*1000).toISOString(),
          dateEnd: new Date().toISOString(),
          calendarIds: ['primary'],
          exclusions: ['lunch', 'gym']
        })
      });
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Audit Test Page</h1>
      <p className="mb-4 text-gray-600">Click the button to create an audit for the past 30 days.</p>
      
      <button 
        onClick={createAudit}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Audit'}
      </button>
      
      {result && (
        <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto text-sm">
          {result}
        </pre>
      )}
    </div>
  );
}