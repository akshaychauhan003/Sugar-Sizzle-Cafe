'use client';
import { Empty, Spinner } from '@/components/shared/ui';

export default function AuditLogTable({ audit }) {
  return (
    <div className="card tablewrap">
      <h3>Audit log</h3>
      {!audit ? (
        <Spinner />
      ) : audit.length === 0 ? (
        <Empty>No audit events.</Empty>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>When</th>
              <th>User</th>
              <th>Action</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.createdAt).toLocaleString()}</td>
                <td>{a.user?.name || '—'}</td>
                <td>{a.action}</td>
                <td>{a.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
