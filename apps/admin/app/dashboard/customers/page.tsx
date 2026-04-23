import { Search, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { customerService } from "@/services";
import { type Customer } from "@/domain";

export default async function CustomersPage() {
  const customersResult = await customerService.getAllCustomers();
  const customers = customersResult.success ? customersResult.data || [] : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
        <p className="text-slate-500 mt-1">Customer information (automatically created when placing orders)</p>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search customers..."
              className="pl-10 bg-slate-50 border-slate-200 focus:border-primary"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {customers.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500">No customers found. Customers are automatically created when you place orders.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left p-4 font-semibold text-slate-700">Name</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Email</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Phone</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Address</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer: Customer) => (
                  <tr key={customer.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900">{customer.name}</td>
                    <td className="p-4 text-slate-700">{customer.email || 'N/A'}</td>
                    <td className="p-4 text-slate-700">{customer.phone}</td>
                    <td className="p-4 text-slate-700">{typeof customer.address === 'string' ? customer.address : 'N/A'}</td>
                    <td className="p-4">
                      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
