'use client';
import { money } from '@/lib/api';
import { Empty, PayBadge, StatusBadge, TypeBadge } from '@/components/shared/ui';

export default function RecentOrdersTable({ orders = [], onOpenBill }) {
  return (
    <div className="card tablewrap">
      <h3>Completed / recent orders</h3>
      {orders.length === 0 ? (
        <Empty>No orders for this period.</Empty>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Order</th>
              <th>Time</th>
              <th>Type</th>
              <th>Status</th>
              <th>Payment</th>
              <th className="r">Total</th>
              <th>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <b>{o.orderNumber}</b>
                </td>
                <td>
                  {new Date(o.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td>
                  <TypeBadge type={o.type} table={o.tableNumber} />
                </td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
                <td>
                  <PayBadge status={o.paymentStatus} />
                </td>
                <td className="r">
                  <b>{money(o.total)}</b>
                </td>
                <td>
                  <button className="btn sm" onClick={() => onOpenBill(o)}>
                    View bill
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
