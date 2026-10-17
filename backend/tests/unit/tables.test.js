const tableService = require('../../src/services/tableService');
const Table = require('../../src/models/Table');

// Mock Table model methods to unit test tableService logic
jest.mock('../../src/models/Table');
jest.mock('../../src/services/auditService', () => ({
  log: jest.fn().mockResolvedValue(true),
}));

describe('Table turnover & assignment workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('assignToOrder succeeds when table is available', async () => {
    const mockTable = { _id: 'tbl-1', code: 'T-01', status: 'available' };
    const mockOrder = { _id: 'ord-1', orderNumber: 'ORD-001' };

    Table.findOneAndUpdate = jest.fn().mockResolvedValue({
      _id: 'tbl-1',
      code: 'T-01',
      status: 'occupied',
      currentOrder: 'ord-1',
    });

    const result = await tableService.assignToOrder(mockTable, mockOrder);
    expect(result.status).toBe('occupied');
    expect(Table.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: 'tbl-1',
        $or: [{ status: 'available' }, { currentOrder: 'ord-1' }],
      },
      { $set: { status: 'occupied', currentOrder: 'ord-1' } },
      { new: true, runValidators: true }
    );
  });

  test('assignToOrder rejects if table is already occupied', async () => {
    const mockTable = { _id: 'tbl-2', code: 'T-02', status: 'occupied' };
    const mockOrder = { _id: 'ord-2', orderNumber: 'ORD-002' };

    Table.findOneAndUpdate = jest.fn().mockResolvedValue(null);
    Table.findById = jest.fn().mockResolvedValue({ status: 'occupied' });

    await expect(tableService.assignToOrder(mockTable, mockOrder)).rejects.toThrow(
      /already booked\/occupied/
    );
  });

  test('assignToOrder rejects if table is in cleaning status', async () => {
    const mockTable = { _id: 'tbl-3', code: 'T-03', status: 'cleaning' };
    const mockOrder = { _id: 'ord-3', orderNumber: 'ORD-003' };

    Table.findOneAndUpdate = jest.fn().mockResolvedValue(null);
    Table.findById = jest.fn().mockResolvedValue({ status: 'cleaning' });

    await expect(tableService.assignToOrder(mockTable, mockOrder)).rejects.toThrow(
      /has not been cleaned yet/
    );
  });

  test('markCustomerLeft transitions table to cleaning', async () => {
    const saveMock = jest.fn().mockResolvedValue(true);
    const mockTable = {
      _id: 'tbl-4',
      code: 'T-04',
      status: 'occupied',
      currentOrder: { orderNumber: 'ORD-004' },
      save: saveMock,
    };

    Table.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockTable),
    });

    const user = { _id: 'usr-1', name: 'Waiter Bob' };
    const result = await tableService.markCustomerLeft('tbl-4', user);

    expect(result.status).toBe('cleaning');
    expect(saveMock).toHaveBeenCalled();
  });

  test('markCleaned transitions table to available and clears currentOrder', async () => {
    const saveMock = jest.fn().mockResolvedValue(true);
    const mockTable = {
      _id: 'tbl-4',
      code: 'T-04',
      status: 'cleaning',
      currentOrder: 'ord-4',
      save: saveMock,
    };

    Table.findById = jest.fn().mockResolvedValue(mockTable);

    const user = { _id: 'usr-1', name: 'Waiter Bob' };
    const result = await tableService.markCleaned('tbl-4', user);

    expect(result.status).toBe('available');
    expect(result.currentOrder).toBeNull();
    expect(saveMock).toHaveBeenCalled();
  });
});
