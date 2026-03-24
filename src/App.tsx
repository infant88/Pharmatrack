import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  AlertTriangle, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight,
  MoreVertical,
  ChevronRight,
  Filter,
  PackagePlus,
  History,
  Sparkles,
  MapPin,
  Brain,
  Zap,
  AlertCircle,
  Star,
  Phone,
  Mail,
  User,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Drug, Order } from './types';
import AIAssistant from './components/AIAssistant';

// Mock data for initial render if DB is not connected
const MOCK_DRUGS: Drug[] = [
  { _id: '1', name: 'Amoxicillin', category: 'Antibiotic', stock: 8, unit: 'Capsules', price: 12.5, expiryDate: '2025-12-01', supplier: 'PharmaCorp', location: 'Shelf A1' },
  { _id: '2', name: 'Paracetamol', category: 'Analgesic', stock: 450, unit: 'Tablets', price: 5.0, expiryDate: '2026-06-15', supplier: 'MediSupply', location: 'Shelf B2' },
  { _id: '3', name: 'Lisinopril', category: 'Antihypertensive', stock: 12, unit: 'Tablets', price: 18.2, expiryDate: '2025-09-20', supplier: 'GlobalHealth', location: 'Shelf C3' },
  { _id: '4', name: 'Metformin', category: 'Antidiabetic', stock: 5, unit: 'Tablets', price: 10.0, expiryDate: '2025-11-10', supplier: 'PharmaCorp', location: 'Shelf A2' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'orders' | 'intelligence'>('dashboard');
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<{ id: string, message: string, type: 'error' | 'success' | 'info' }[]>([]);
  const [dbStatus, setDbStatus] = useState<'connected' | 'mock' | 'connecting'>('connecting');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [expandedDrugId, setExpandedDrugId] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<{ id: string, contact: string, rating: number } | null>(null);
  const [selectedDrugForHistory, setSelectedDrugForHistory] = useState<Drug | null>(null);
  const [newOrder, setNewOrder] = useState({ drugId: '', quantity: 10 });
  const [newDrug, setNewDrug] = useState<Partial<Drug>>({
    name: '',
    category: '',
    stock: 0,
    unit: 'Units',
    price: 0,
    expiryDate: new Date().toISOString().split('T')[0],
    supplier: '',
    location: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const addNotification = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [drugsRes, ordersRes] = await Promise.all([
        fetch('/api/drugs'),
        fetch('/api/orders')
      ]);
      
      if (!drugsRes.ok || !ordersRes.ok) {
        throw new Error(`Server responded with error: ${drugsRes.status} ${drugsRes.statusText}`);
      }

      const drugsData = await drugsRes.json();
      const ordersData = await ordersRes.json();
      
      // Check if we're in mock mode based on a custom header or just data presence
      // For this implementation, we'll assume if drugsData is empty and we have MOCK_DRUGS, it might be mock
      // But better to have an explicit health check
      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        const health = await healthRes.json();
        setDbStatus(health.database === 'connected' ? 'connected' : 'mock');
      }

      setDrugs(drugsData);
      setOrders(ordersData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      addNotification("Could not connect to database. Running in offline mock mode.", "error");
      setDrugs(MOCK_DRUGS);
      setDbStatus('mock');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/drugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDrug)
      });

      if (!res.ok) throw new Error("Failed to add drug");

      const addedDrug = await res.json();
      setDrugs(prev => [...prev, addedDrug]);
      setIsAddModalOpen(false);
      addNotification(`${newDrug.name} added to inventory`, "success");
      setNewDrug({
        name: '',
        category: '',
        stock: 0,
        unit: 'Units',
        price: 0,
        expiryDate: new Date().toISOString().split('T')[0],
        supplier: '',
        location: ''
      });
    } catch (error) {
      addNotification("Error adding drug to inventory", "error");
    }
  };

  const handleStockUpdate = async (drugId: string, stockChange: number, type: 'Inbound' | 'Outbound' | 'Adjustment') => {
    try {
      const res = await fetch(`/api/drugs/${drugId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockChange, type })
      });

      if (!res.ok) throw new Error("Failed to update stock");

      const updatedDrug = await res.json();
      setDrugs(prev => prev.map(d => d._id === drugId ? updatedDrug : d));
      addNotification(`Stock updated for ${updatedDrug.name}`, "success");
      
      if (selectedDrugForHistory?._id === drugId) {
        setSelectedDrugForHistory(updatedDrug);
      }
    } catch (error) {
      addNotification("Error updating stock", "error");
    }
  };

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const drug = drugs.find(d => d._id === newOrder.drugId);
      if (!drug) return;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drugId: drug._id,
          drugName: drug.name,
          quantity: newOrder.quantity,
          expectedDelivery: new Date(Date.now() + 86400000 * 5).toISOString()
        })
      });

      if (!res.ok) throw new Error("Failed to create order");

      const createdOrder = await res.json();
      setOrders(prev => [createdOrder, ...prev]);
      setIsOrderModalOpen(false);
      addNotification(`Order created for ${drug.name}`, "success");
    } catch (error) {
      addNotification("Error creating order", "error");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!res.ok) throw new Error("Failed to update order");

      const updatedOrder = await res.json();
      setOrders(prev => prev.map(o => o._id === orderId ? updatedOrder : o));
      addNotification(`Order ${status.toLowerCase()}`, "info");
    } catch (error) {
      addNotification("Error updating order", "error");
    }
  };

  const handleUpdateSupplier = async (drugId: string) => {
    if (!editingSupplier) return;
    try {
      const res = await fetch(`/api/drugs/${drugId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierContact: editingSupplier.contact,
          supplierRating: editingSupplier.rating
        })
      });

      if (!res.ok) throw new Error("Failed to update supplier");

      const updatedDrug = await res.json();
      setDrugs(prev => prev.map(d => d._id === drugId ? updatedDrug : d));
      setEditingSupplier(null);
      addNotification("Supplier information updated", "success");
    } catch (error) {
      addNotification("Error updating supplier", "error");
    }
  };

  const lowStockDrugs = drugs.filter(d => d.stock <= 10);

  const expiringDrugs = React.useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    return drugs.filter(drug => {
      const expiryDate = new Date(drug.expiryDate);
      return expiryDate >= today && expiryDate <= thirtyDaysFromNow;
    }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [drugs]);

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-[#141414] bg-[#E4E3E0] z-50 hidden md:block">
        <div className="p-8 border-bottom border-[#141414]">
          <h1 className="text-2xl font-bold tracking-tighter flex items-center gap-2">
            <Package className="w-6 h-6" />
            PHARMATRACK
          </h1>
          <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1 font-mono">Supply Chain Management</p>
        </div>

        <nav className="mt-8 px-4 space-y-2">
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
          />
          <NavItem 
            active={activeTab === 'inventory'} 
            onClick={() => setActiveTab('inventory')}
            icon={<Package size={18} />}
            label="Inventory"
          />
          <NavItem 
            active={activeTab === 'orders'} 
            onClick={() => setActiveTab('orders')}
            icon={<Truck size={18} />}
            label="Supply Chain"
          />
          <NavItem 
            active={activeTab === 'intelligence'} 
            onClick={() => setActiveTab('intelligence')}
            icon={<Sparkles size={18} />}
            label="Intelligence"
          />
        </nav>

        <div className="absolute bottom-8 left-8 right-8">
          {/* System status removed as per user request */}
        </div>
      </aside>

      {/* Notifications */}
      <div className="fixed top-8 right-8 z-[100] space-y-4 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={cn(
                "p-4 rounded-sm border shadow-2xl pointer-events-auto min-w-[300px] flex items-center gap-3",
                n.type === 'error' ? "bg-red-50 border-red-500 text-red-800" :
                n.type === 'success' ? "bg-green-50 border-green-500 text-green-800" :
                "bg-white border-[#141414] text-[#141414]"
              )}
            >
              {n.type === 'error' && <AlertTriangle size={18} />}
              <p className="text-sm font-medium">{n.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <main className="md:ml-64 p-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-4xl font-serif italic tracking-tight">
              {activeTab === 'dashboard' && "Overview"}
              {activeTab === 'inventory' && "Drug Inventory"}
              {activeTab === 'orders' && "Supply Chain"}
              {activeTab === 'intelligence' && "Pharma Intelligence"}
            </h2>
            <p className="text-sm opacity-60 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={16} />
              <input 
                type="text" 
                placeholder="Search inventory..."
                className="pl-10 pr-4 py-2 bg-transparent border border-[#141414] rounded-sm focus:outline-none focus:bg-[#141414] focus:text-[#E4E3E0] transition-colors w-64 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="p-2 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors rounded-sm"
            >
              <Plus size={20} />
            </button>
          </div>
        </header>

        {/* New Order Modal */}
        <AnimatePresence>
          {isOrderModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOrderModalOpen(false)}
                className="absolute inset-0 bg-[#141414]/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-[#E4E3E0] border border-[#141414] p-8 rounded-sm shadow-2xl"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-3xl font-serif italic">New Order</h3>
                  <button onClick={() => setIsOrderModalOpen(false)} className="opacity-50 hover:opacity-100">
                    <Plus className="rotate-45" size={24} />
                  </button>
                </div>

                <form onSubmit={handleAddOrder} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-mono opacity-60">Select Drug</label>
                    <select 
                      required
                      className="w-full bg-transparent border-b border-[#141414] py-2 focus:outline-none focus:border-b-2 transition-all"
                      value={newOrder.drugId}
                      onChange={e => setNewOrder({...newOrder, drugId: e.target.value})}
                    >
                      <option value="">Choose a drug...</option>
                      {drugs.map(d => (
                        <option key={d._id} value={d._id}>{d.name} ({d.stock} {d.unit} in stock)</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-mono opacity-60">Quantity</label>
                    <input 
                      required
                      type="number" 
                      min="1"
                      className="w-full bg-transparent border-b border-[#141414] py-2 focus:outline-none focus:border-b-2 transition-all"
                      value={newOrder.quantity}
                      onChange={e => setNewOrder({...newOrder, quantity: parseInt(e.target.value)})}
                    />
                  </div>
                  
                  <div className="pt-8">
                    <button 
                      type="submit"
                      className="w-full py-4 bg-[#141414] text-[#E4E3E0] font-mono uppercase tracking-widest hover:bg-opacity-90 transition-all"
                    >
                      Create Purchase Order
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Drug Modal */}
        <AnimatePresence>
          {isAddModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddModalOpen(false)}
                className="absolute inset-0 bg-[#141414]/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-[#E4E3E0] border border-[#141414] p-8 rounded-sm shadow-2xl overflow-y-auto max-h-[90vh]"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-3xl font-serif italic">Add New Drug</h3>
                  <button onClick={() => setIsAddModalOpen(false)} className="opacity-50 hover:opacity-100">
                    <Plus className="rotate-45" size={24} />
                  </button>
                </div>

                <form onSubmit={handleAddDrug} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-mono opacity-60">Drug Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-transparent border-b border-[#141414] py-2 focus:outline-none focus:border-b-2 transition-all"
                      value={newDrug.name}
                      onChange={e => setNewDrug({...newDrug, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-mono opacity-60">Category</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-transparent border-b border-[#141414] py-2 focus:outline-none focus:border-b-2 transition-all"
                      value={newDrug.category}
                      onChange={e => setNewDrug({...newDrug, category: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-mono opacity-60">Stock Level</label>
                    <input 
                      required
                      type="number" 
                      className="w-full bg-transparent border-b border-[#141414] py-2 focus:outline-none focus:border-b-2 transition-all"
                      value={newDrug.stock}
                      onChange={e => setNewDrug({...newDrug, stock: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-mono opacity-60">Unit (e.g. Tablets)</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-transparent border-b border-[#141414] py-2 focus:outline-none focus:border-b-2 transition-all"
                      value={newDrug.unit}
                      onChange={e => setNewDrug({...newDrug, unit: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-mono opacity-60">Price per Unit ($)</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      className="w-full bg-transparent border-b border-[#141414] py-2 focus:outline-none focus:border-b-2 transition-all"
                      value={newDrug.price}
                      onChange={e => setNewDrug({...newDrug, price: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-mono opacity-60">Expiry Date</label>
                    <input 
                      required
                      type="date" 
                      className="w-full bg-transparent border-b border-[#141414] py-2 focus:outline-none focus:border-b-2 transition-all"
                      value={newDrug.expiryDate}
                      onChange={e => setNewDrug({...newDrug, expiryDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-mono opacity-60">Supplier</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-transparent border-b border-[#141414] py-2 focus:outline-none focus:border-b-2 transition-all"
                      value={newDrug.supplier}
                      onChange={e => setNewDrug({...newDrug, supplier: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-mono opacity-60">Storage Location</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-transparent border-b border-[#141414] py-2 focus:outline-none focus:border-b-2 transition-all"
                      value={newDrug.location}
                      onChange={e => setNewDrug({...newDrug, location: e.target.value})}
                    />
                  </div>
                  
                  <div className="md:col-span-2 pt-8">
                    <button 
                      type="submit"
                      className="w-full py-4 bg-[#141414] text-[#E4E3E0] font-mono uppercase tracking-widest hover:bg-opacity-90 transition-all"
                    >
                      Add to Inventory
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div onClick={() => { setActiveTab('inventory'); setSearchTerm(''); }} className="cursor-pointer">
                  <StatCard label="Total Drugs" value={drugs.length.toString()} trend="+2" icon={<Package size={20} />} />
                </div>
                <div onClick={() => { setActiveTab('inventory'); setSearchTerm(''); /* In a real app we'd apply a filter state */ }} className="cursor-pointer">
                  <StatCard label="Low Stock" value={lowStockDrugs.length.toString()} trend={lowStockDrugs.length > 0 ? "Alert" : "Safe"} alert={lowStockDrugs.length > 0} icon={<AlertTriangle size={20} />} />
                </div>
                <div onClick={() => setActiveTab('orders')} className="cursor-pointer">
                  <StatCard label="Pending Orders" value={orders.filter(o => o.status === 'Pending').length.toString()} trend="Active" icon={<Truck size={20} />} />
                </div>
                <div className="cursor-default">
                  <StatCard label="Inventory Value" value={`$${drugs.reduce((acc, d) => acc + (d.stock * d.price), 0).toLocaleString()}`} trend="+12%" icon={<History size={20} />} />
                </div>
              </div>

              {/* Alerts Section */}
              {lowStockDrugs.length > 0 && (
                <section className="border border-[#141414] bg-[#141414] text-[#E4E3E0] p-6 rounded-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-serif italic flex items-center gap-2">
                      <AlertTriangle className="text-yellow-500" />
                      Critical Stock Alerts
                    </h3>
                    <span className="text-[10px] uppercase tracking-widest opacity-70 font-mono">Action Required</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lowStockDrugs.map(drug => (
                      <div key={drug._id} className="p-4 border border-[#E4E3E0]/20 rounded-sm flex justify-between items-center">
                        <div>
                          <p className="font-bold">{drug.name}</p>
                          <p className="text-xs opacity-70">{drug.stock} {drug.unit} remaining</p>
                        </div>
                        <button 
                          onClick={() => handleStockUpdate(drug._id, 100, 'Inbound')}
                          className="text-xs px-3 py-1 border border-[#E4E3E0] hover:bg-[#E4E3E0] hover:text-[#141414] transition-colors font-mono"
                        >
                          RESTOCK
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Expiring Soon Section */}
              {expiringDrugs.length > 0 && (
                <section className="border border-red-500 bg-red-500/5 p-6 rounded-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-serif italic flex items-center gap-2 text-red-700">
                      <AlertCircle className="text-red-500" />
                      Expiring Within 30 Days
                    </h3>
                    <span className="text-[10px] uppercase tracking-widest opacity-70 font-mono text-red-700">Immediate Attention</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {expiringDrugs.map(drug => (
                      <div 
                        key={drug._id} 
                        onClick={() => setSelectedDrugForHistory(drug)}
                        className="p-4 border border-red-200 bg-white rounded-sm flex justify-between items-center shadow-sm hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div>
                          <p className="font-bold text-[#141414] group-hover:text-red-600 transition-colors">{drug.name}</p>
                          <div className="flex flex-col gap-1 mt-1">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-red-600 font-bold">
                              Expires: {new Date(drug.expiryDate).toLocaleDateString()}
                            </p>
                            <p className="text-xs opacity-60">Stock: {drug.stock} {drug.unit}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                           <History size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="border border-[#141414] p-6 rounded-sm bg-white/50">
                  <h3 className="text-lg font-serif italic mb-6">Stock Distribution</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={drugs.slice(0, 6)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#141414" vertical={false} opacity={0.1} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#141414', border: 'none', color: '#E4E3E0', borderRadius: '0px' }}
                          itemStyle={{ color: '#E4E3E0' }}
                        />
                        <Bar dataKey="stock" fill="#141414" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="border border-[#141414] p-6 rounded-sm bg-white/50">
                  <h3 className="text-lg font-serif italic mb-6">Recent Orders</h3>
                  <div className="space-y-4">
                    {orders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[240px] opacity-40">
                        <Truck size={48} strokeWidth={1} />
                        <p className="mt-4 font-mono text-sm uppercase tracking-widest">No recent orders</p>
                      </div>
                    ) : (
                      orders.slice(0, 5).map(order => (
                        <div key={order._id} className="flex items-center justify-between p-3 border-b border-[#141414]/10 last:border-0 hover:bg-[#141414]/5 transition-colors cursor-pointer group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 border border-[#141414] flex items-center justify-center group-hover:bg-[#141414] group-hover:text-[#E4E3E0] transition-colors">
                              <Package size={18} />
                            </div>
                            <div>
                              <p className="font-bold text-sm">{order.drugName}</p>
                              <p className="text-[10px] font-mono opacity-50 uppercase tracking-tighter">{new Date(order.orderDate).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">Qty: {order.quantity}</p>
                            <span className={cn(
                              "text-[9px] px-2 py-0.5 border font-mono uppercase tracking-widest",
                              order.status === 'Pending' ? "border-yellow-600 text-yellow-600" :
                              order.status === 'Shipped' ? "border-blue-600 text-blue-600" :
                              "border-green-600 text-green-600"
                            )}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div 
              key="inventory"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="border border-[#141414] rounded-sm overflow-hidden bg-white/30 backdrop-blur-sm">
                <div className="p-4 border-b border-[#141414] flex justify-between items-center bg-[#141414] text-[#E4E3E0]">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono uppercase tracking-widest opacity-70">Inventory List</span>
                    <div className="h-4 w-[1px] bg-[#E4E3E0]/30" />
                    <span className="text-[10px] font-mono uppercase tracking-widest">{drugs.length} Items</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="p-1.5 border border-[#E4E3E0]/30 hover:bg-[#E4E3E0] hover:text-[#141414] transition-colors"
                      title="Clear Filters"
                    >
                      <Filter size={14} />
                    </button>
                    <button 
                      onClick={() => setIsAddModalOpen(true)}
                      className="p-1.5 border border-[#E4E3E0]/30 hover:bg-[#E4E3E0] hover:text-[#141414] transition-colors"
                      title="Add New Drug"
                    >
                      <PackagePlus size={14} />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#141414]">
                        <th className="p-4 text-[10px] font-mono uppercase tracking-widest opacity-50 italic font-normal">Drug Name</th>
                        <th className="p-4 text-[10px] font-mono uppercase tracking-widest opacity-50 italic font-normal">Category</th>
                        <th className="p-4 text-[10px] font-mono uppercase tracking-widest opacity-50 italic font-normal">Stock Level</th>
                        <th className="p-4 text-[10px] font-mono uppercase tracking-widest opacity-50 italic font-normal">Unit Price</th>
                        <th className="p-4 text-[10px] font-mono uppercase tracking-widest opacity-50 italic font-normal">Expiry</th>
                        <th className="p-4 text-[10px] font-mono uppercase tracking-widest opacity-50 italic font-normal">Location</th>
                        <th className="p-4 text-[10px] font-mono uppercase tracking-widest opacity-50 italic font-normal">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drugs.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())).map((drug) => (
                        <React.Fragment key={drug._id}>
                          <tr 
                            onClick={() => setExpandedDrugId(expandedDrugId === drug._id ? null : drug._id)}
                            className={cn(
                              "border-b border-[#141414]/10 hover:bg-[#141414] hover:text-[#E4E3E0] transition-all group cursor-pointer",
                              expandedDrugId === drug._id ? "bg-[#141414] text-[#E4E3E0]" : ""
                            )}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-2 h-2 rounded-full transition-colors",
                                  expandedDrugId === drug._id ? "bg-[#E4E3E0]" : "bg-[#141414] group-hover:bg-[#E4E3E0]"
                                )} />
                                <span className="font-bold">{drug.name}</span>
                                {expandedDrugId === drug._id ? <ChevronUp size={14} className="opacity-50" /> : <ChevronDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />}
                              </div>
                            </td>
                            <td className="p-4 text-sm opacity-70 group-hover:opacity-100">{drug.category}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "font-mono text-sm font-bold",
                                  drug.stock <= 10 ? "text-red-500 group-hover:text-red-400" : ""
                                )}>
                                  {drug.stock.toString().padStart(3, '0')}
                                </span>
                                <span className="text-[10px] opacity-50 group-hover:opacity-70">{drug.unit}</span>
                                {drug.stock <= 10 && <AlertTriangle size={12} className="text-red-500 group-hover:text-red-400" />}
                              </div>
                            </td>
                            <td className="p-4 font-mono text-sm">${drug.price.toFixed(2)}</td>
                            <td className="p-4 text-sm opacity-70 group-hover:opacity-100">{new Date(drug.expiryDate).toLocaleDateString()}</td>
                            <td className="p-4 text-sm font-mono opacity-70 group-hover:opacity-100">{drug.location}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedDrugForHistory(drug); }}
                                  className={cn(
                                    "p-1.5 border transition-colors rounded-sm",
                                    expandedDrugId === drug._id ? "border-[#E4E3E0]/30 hover:bg-[#E4E3E0] hover:text-[#141414]" : "border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0]"
                                  )}
                                  title="View History"
                                >
                                  <History size={14} />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleStockUpdate(drug._id, 10, 'Inbound'); }}
                                  className="p-1.5 border border-green-500 text-green-600 hover:bg-green-500 hover:text-white transition-colors rounded-sm"
                                  title="Add Stock (+10)"
                                >
                                  <ArrowUpRight size={14} />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleStockUpdate(drug._id, -10, 'Outbound'); }}
                                  className="p-1.5 border border-red-500 text-red-600 hover:bg-red-500 hover:text-white transition-colors rounded-sm"
                                  title="Remove Stock (-10)"
                                >
                                  <ArrowDownRight size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedDrugId === drug._id && (
                            <tr>
                              <td colSpan={7} className="p-0 border-b border-[#141414]">
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="bg-[#141414] text-[#E4E3E0] p-8 border-t border-[#E4E3E0]/10 overflow-hidden"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                                    <div className="space-y-4">
                                      <div className="flex justify-between items-center">
                                        <h5 className="text-[10px] uppercase tracking-[0.2em] font-mono opacity-50">Supplier Information</h5>
                                        {editingSupplier?.id === drug._id ? (
                                          <button 
                                            onClick={() => handleUpdateSupplier(drug._id)}
                                            className="text-[10px] font-mono uppercase tracking-widest text-green-500 hover:underline"
                                          >
                                            Save Changes
                                          </button>
                                        ) : (
                                          <button 
                                            onClick={() => setEditingSupplier({ id: drug._id, contact: drug.supplierContact || '', rating: drug.supplierRating || 0 })}
                                            className="text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 hover:underline"
                                          >
                                            Edit Details
                                          </button>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 border border-[#E4E3E0]/20 flex items-center justify-center rounded-sm">
                                          <User size={24} className="opacity-60" />
                                        </div>
                                        <div>
                                          <p className="text-xl font-serif italic">{drug.supplier || 'Unknown Supplier'}</p>
                                          <div className="flex items-center gap-1 mt-1">
                                            {editingSupplier?.id === drug._id ? (
                                              <input 
                                                type="number" 
                                                min="0" 
                                                max="5" 
                                                step="0.1"
                                                className="bg-transparent border-b border-[#E4E3E0]/30 text-[10px] font-mono w-12 focus:outline-none"
                                                value={editingSupplier.rating}
                                                onChange={e => setEditingSupplier({...editingSupplier, rating: parseFloat(e.target.value)})}
                                              />
                                            ) : (
                                              <>
                                                {[...Array(5)].map((_, i) => (
                                                  <Star 
                                                    key={i} 
                                                    size={10} 
                                                    className={cn(
                                                      i < Math.floor(drug.supplierRating || 0) ? "text-yellow-500 fill-yellow-500" : "text-[#E4E3E0]/20"
                                                    )} 
                                                  />
                                                ))}
                                                <span className="text-[10px] font-mono ml-2 opacity-60">{(drug.supplierRating || 0).toFixed(1)} / 5.0</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-4">
                                      <h5 className="text-[10px] uppercase tracking-[0.2em] font-mono opacity-50">Contact Details</h5>
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-sm">
                                          <Phone size={14} className="opacity-40" />
                                          {editingSupplier?.id === drug._id ? (
                                            <input 
                                              className="bg-transparent border-b border-[#E4E3E0]/30 font-mono text-xs w-full focus:outline-none"
                                              value={editingSupplier.contact}
                                              onChange={e => setEditingSupplier({...editingSupplier, contact: e.target.value})}
                                            />
                                          ) : (
                                            <span className="font-mono">{drug.supplierContact || '+1 (000) 000-0000'}</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                          <Mail size={14} className="opacity-40" />
                                          <span className="font-mono">{drug.supplier?.toLowerCase().replace(/\s/g, '') || 'info'}@pharmasupply.com</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-4">
                                      <h5 className="text-[10px] uppercase tracking-[0.2em] font-mono opacity-50">Supply Reliability</h5>
                                      <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-mono uppercase">
                                          <span>Fulfillment Rate</span>
                                          <span>98%</span>
                                        </div>
                                        <div className="h-1 bg-[#E4E3E0]/10 rounded-full overflow-hidden">
                                          <div className="h-full bg-green-500 w-[98%]" />
                                        </div>
                                        <p className="text-[10px] opacity-40 italic">Last order delivered 2 days ahead of schedule.</p>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* History Modal */}
          <AnimatePresence>
            {selectedDrugForHistory && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedDrugForHistory(null)}
                  className="absolute inset-0 bg-[#141414]/60 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-3xl bg-[#E4E3E0] border border-[#141414] p-8 rounded-sm shadow-2xl overflow-y-auto max-h-[90vh]"
                >
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-3xl font-serif italic">{selectedDrugForHistory.name}</h3>
                      <p className="text-xs font-mono uppercase tracking-widest opacity-60">Stock Movement History</p>
                    </div>
                    <button onClick={() => setSelectedDrugForHistory(null)} className="opacity-50 hover:opacity-100">
                      <Plus className="rotate-45" size={24} />
                    </button>
                  </div>

                  <div className="mb-8 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedDrugForHistory.history || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#14141420" />
                        <XAxis 
                          dataKey="timestamp" 
                          tickFormatter={(val) => new Date(val).toLocaleDateString()}
                          tick={{ fontSize: 10, fontFamily: 'monospace' }}
                        />
                        <YAxis tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#141414', border: 'none', color: '#E4E3E0' }}
                          itemStyle={{ color: '#E4E3E0' }}
                          labelFormatter={(val) => new Date(val).toLocaleString()}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="newStock" 
                          stroke="#141414" 
                          strokeWidth={2} 
                          dot={{ r: 4, fill: '#141414' }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-4 text-[10px] uppercase tracking-widest font-mono opacity-60 border-b border-[#141414] pb-2">
                      <span>Date & Time</span>
                      <span>Type</span>
                      <span>Change</span>
                      <span>Balance</span>
                    </div>
                    {(selectedDrugForHistory.history || []).slice().reverse().map((h, i) => (
                      <div key={i} className="grid grid-cols-4 text-xs font-mono py-2 border-b border-[#141414]/10">
                        <span className="opacity-60">{new Date(h.timestamp).toLocaleString()}</span>
                        <span className={cn(
                          "font-bold",
                          h.type === 'Inbound' ? "text-green-600" : 
                          h.type === 'Outbound' ? "text-red-600" : "text-blue-600"
                        )}>{h.type}</span>
                        <span className={h.change > 0 ? "text-green-600" : "text-red-600"}>
                          {h.change > 0 ? `+${h.change}` : h.change}
                        </span>
                        <span className="font-bold">{h.newStock}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {activeTab === 'orders' && (
            <motion.div 
              key="orders"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-2xl font-serif italic">Active Shipments</h3>
                  <p className="text-sm opacity-60">Tracking drug placement and supply chain flow</p>
                </div>
                <button 
                  onClick={() => setIsOrderModalOpen(true)}
                  className="px-6 py-2 bg-[#141414] text-[#E4E3E0] text-sm font-mono tracking-widest uppercase hover:bg-opacity-90 transition-all flex items-center gap-2"
                >
                  <Plus size={16} />
                  New Order
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Order Tracking Timeline */}
                <div className="lg:col-span-2 space-y-4">
                  {orders.length === 0 ? (
                    <div className="h-64 border border-dashed border-[#141414]/30 flex flex-col items-center justify-center rounded-sm">
                      <Truck size={40} className="opacity-20" />
                      <p className="mt-4 font-mono text-xs opacity-40 uppercase tracking-widest">No active shipments in transit</p>
                    </div>
                  ) : (
                    orders.map(order => (
                      <div key={order._id} className="border border-[#141414] p-6 rounded-sm bg-white/50 hover:shadow-xl transition-shadow">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <p className="text-[10px] font-mono uppercase tracking-widest opacity-50 mb-1">Order ID: {order._id.slice(-8).toUpperCase()}</p>
                            <h4 className="text-xl font-bold">{order.drugName}</h4>
                          </div>
                          <div className="text-right">
                            <span className={cn(
                              "text-[10px] px-3 py-1 border font-mono uppercase tracking-widest",
                              order.status === 'Pending' ? "border-yellow-600 text-yellow-600" :
                              order.status === 'Shipped' ? "border-blue-600 text-blue-600" :
                              "border-green-600 text-green-600"
                            )}>
                              {order.status}
                            </span>
                            <p className="text-[10px] opacity-50 mt-2 font-mono">Expected: {new Date(order.expectedDelivery).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="relative h-1 bg-[#141414]/10 rounded-full mb-8">
                          <div 
                            className="absolute left-0 top-0 h-full bg-[#141414] transition-all duration-1000" 
                            style={{ width: order.status === 'Pending' ? '25%' : order.status === 'Shipped' ? '75%' : '100%' }}
                          />
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#141414]" />
                          <div className="absolute left-[25%] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#141414]" />
                          <div className="absolute left-[75%] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#141414]" />
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#141414]" />
                        </div>

                        <div className="flex justify-between text-[10px] font-mono uppercase tracking-tighter opacity-50">
                          <span>Ordered</span>
                          <span>Processing</span>
                          <span>In Transit</span>
                          <span>Delivered</span>
                        </div>
                        <div className="flex justify-between items-center mt-8 pt-6 border-t border-[#141414]/10">
                          <div className="flex gap-2">
                            {order.status === 'Pending' && (
                              <button 
                                onClick={() => handleUpdateOrderStatus(order._id, 'Shipped')}
                                className="px-4 py-1.5 border border-[#141414] text-[10px] font-mono uppercase tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
                              >
                                Mark Shipped
                              </button>
                            )}
                            {order.status === 'Shipped' && (
                              <button 
                                onClick={() => handleUpdateOrderStatus(order._id, 'Delivered')}
                                className="px-4 py-1.5 border border-green-600 text-green-600 text-[10px] font-mono uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all"
                              >
                                Mark Delivered
                              </button>
                            )}
                            {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                              <button 
                                onClick={() => handleUpdateOrderStatus(order._id, 'Cancelled')}
                                className="px-4 py-1.5 border border-red-600 text-red-600 text-[10px] font-mono uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest opacity-40">
                            <Zap size={10} />
                            Real-time Tracking Active
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Suppliers & Quick Actions */}
                <div className="space-y-6">
                  <div className="border border-[#141414] p-6 rounded-sm bg-[#141414] text-[#E4E3E0]">
                    <h4 className="text-lg font-serif italic mb-4">Quick Restock</h4>
                    <p className="text-xs opacity-70 mb-6">Frequently ordered items with low stock levels.</p>
                    <div className="space-y-4">
                      {lowStockDrugs.slice(0, 3).map(drug => (
                        <div key={drug._id} className="flex items-center justify-between p-3 border border-[#E4E3E0]/20 rounded-sm">
                          <span className="text-sm font-bold">{drug.name}</span>
                          <button className="text-[10px] font-mono border border-[#E4E3E0] px-2 py-1 hover:bg-[#E4E3E0] hover:text-[#141414] transition-colors">
                            ORDER
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-[#141414] p-6 rounded-sm bg-white/50">
                    <h4 className="text-lg font-serif italic mb-4">Key Suppliers</h4>
                    <div className="space-y-4">
                      {['PharmaCorp', 'MediSupply', 'GlobalHealth'].map(supplier => (
                        <div key={supplier} className="flex items-center justify-between group cursor-pointer">
                          <span className="text-sm opacity-70 group-hover:opacity-100 transition-opacity">{supplier}</span>
                          <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'intelligence' && (
            <motion.div 
              key="intelligence"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AIAssistant drugs={drugs} orders={orders} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#E4E3E0] border-t border-[#141414] flex items-center justify-around px-4 z-50">
        <button onClick={() => setActiveTab('dashboard')} className={cn("p-2", activeTab === 'dashboard' ? "text-[#141414]" : "text-[#141414]/40")}>
          <LayoutDashboard size={24} />
        </button>
        <button onClick={() => setActiveTab('inventory')} className={cn("p-2", activeTab === 'inventory' ? "text-[#141414]" : "text-[#141414]/40")}>
          <Package size={24} />
        </button>
        <button onClick={() => setActiveTab('orders')} className={cn("p-2", activeTab === 'orders' ? "text-[#141414]" : "text-[#141414]/40")}>
          <Truck size={24} />
        </button>
        <button onClick={() => setActiveTab('intelligence')} className={cn("p-2", activeTab === 'intelligence' ? "text-[#141414]" : "text-[#141414]/40")}>
          <Sparkles size={24} />
        </button>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-sm font-mono uppercase tracking-widest transition-all rounded-sm",
        active 
          ? "bg-[#141414] text-[#E4E3E0] shadow-lg" 
          : "text-[#141414] hover:bg-[#141414]/5"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ label, value, trend, icon, alert }: { label: string, value: string, trend: string, icon: React.ReactNode, alert?: boolean }) {
  return (
    <div className={cn(
      "p-6 border border-[#141414] rounded-sm bg-white/50 relative overflow-hidden group hover:bg-[#141414] hover:text-[#E4E3E0] transition-all duration-300",
      alert && "border-red-500 bg-red-50/50"
    )}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 border border-[#141414] group-hover:border-[#E4E3E0] transition-colors">
          {icon}
        </div>
        <span className={cn(
          "text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border border-[#141414] group-hover:border-[#E4E3E0]",
          alert ? "bg-red-500 text-white border-red-500" : ""
        )}>
          {trend}
        </span>
      </div>
      <h4 className="text-[10px] uppercase tracking-widest opacity-50 font-mono mb-1">{label}</h4>
      <p className="text-3xl font-serif italic tracking-tighter">{value}</p>
      
      {/* Decorative lines */}
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
        {icon}
      </div>
    </div>
  );
}
