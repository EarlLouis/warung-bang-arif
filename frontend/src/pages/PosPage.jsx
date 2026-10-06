import React, { useState, useEffect } from 'react';
import { 
  Plus, Minus, Trash2, Search, Pin, QrCode, CreditCard, 
  Banknote, AlertCircle, Sparkles, Check, ShoppingCart
} from 'lucide-react';
import { fetchApi, formatRupiah } from '../utils/api';
import ReceiptModal from '../components/ReceiptModal';
import FoodThumbnail from '../components/FoodThumbnail';
import QrCodeSvg from '../components/QrCodeSvg';

export default function PosPage({ currentUser, activeShift, onOpenShiftModal }) {
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [categories, setCategories] = useState(['Semua']);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('DINE_IN');
  const [tableNumber, setTableNumber] = useState('Meja 01');
  const [customerName, setCustomerName] = useState('Pelanggan Walk-in');
  const [orderNotes, setOrderNotes] = useState('');

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cashAmount, setCashAmount] = useState('');
  const [discount, setDiscount] = useState(0);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState(null);

  const loadMenus = async () => {
    try {
      setLoadingMenus(true);
      const data = await fetchApi('/pos/menus');
      setMenus(data);
      const uniqueCats = ['Semua', ...new Set(data.map(m => m.category))];
      setCategories(uniqueCats);
    } catch (err) {
      console.error('Failed to load menus:', err);
    } finally {
      setLoadingMenus(false);
    }
  };

  useEffect(() => {
    loadMenus();
  }, []);

  // Fungsi penambahan langsung ke keranjang (Bypass Modal)
  const handleDirectAddToCart = (menu) => {
    if (!Boolean(menu.is_in_stock)) return;

    const defaultSpicyLevel = 'Sedang';
    const defaultSweetnessLevel = 'Sedang / Pas';
    const defaultNotes = '';

    const existingIndex = cart.findIndex(
      item => item.menuId === menu.id &&
              item.spicyLevel === defaultSpicyLevel &&
              item.sweetnessLevel === defaultSweetnessLevel &&
              item.notes === defaultNotes
    );

    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].qty += 1;
      setCart(newCart);
    } else {
      setCart([
        ...cart,
        {
          menuId: menu.id,
          name: menu.name,
          code: menu.code,
          category: menu.category,
          unitPrice: parseFloat(menu.sell_price),
          qty: 1,
          spicyLevel: defaultSpicyLevel,
          sweetnessLevel: defaultSweetnessLevel,
          notes: defaultNotes
        }
      ]);
    }
  };

  const updateCartQty = (index, delta) => {
    const newCart = [...cart];
    newCart[index].qty += delta;
    if (newCart[index].qty <= 0) {
      newCart.splice(index, 1);
    }
    setCart(newCart);
  };

  const removeCartItem = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
  const totalAmount = Math.max(0, subtotal - parseFloat(discount || 0));
  const changeAmount = paymentMethod === 'CASH' ? Math.max(0, parseFloat(cashAmount || 0) - totalAmount) : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!activeShift) {
      alert('Perhatian: Anda belum membuka shift kasir! Silakan buka shift terlebih dahulu.');
      onOpenShiftModal();
      return;
    }

    setProcessingOrder(true);
    try {
      const orderPayload = {
        orderType,
        customerName: customerName || 'Pelanggan Walk-in',
        tableNumber: orderType === 'DINE_IN' ? tableNumber : '-',
        userId: currentUser?.id || 2,
        userShiftId: activeShift.id,
        items: cart,
        discount: parseFloat(discount || 0),
        paymentMethod,
        amountPaid: paymentMethod === 'CASH' ? parseFloat(cashAmount || totalAmount) : totalAmount,
        notes: orderNotes
      };

      const result = await fetchApi('/pos/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload)
      });

      // Fetch receipt details
      const receipt = await fetchApi(`/pos/orders/${result.order.id}/receipt`);
      setCompletedReceipt(receipt);

      // Reset Cart
      setCart([]);
      setShowPaymentModal(false);
      setDiscount(0);
      setCashAmount('');
      setOrderNotes('');
      // Reload menus to reflect new stock
      loadMenus();
    } catch (err) {
      alert('Gagal memproses pesanan: ' + err.message);
    } finally {
      setProcessingOrder(false);
    }
  };

  // Filtered menu
  const filteredMenus = menus.filter(m => {
    const matchCategory = selectedCategory === 'Semua' || m.category === selectedCategory;
    const matchSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        m.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-105px)] overflow-hidden bg-slate-100">
      {/* Left Menu Section */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-slate-200 bg-white">
        {/* Top Controls: Search & Category Chips */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari menu ayam bakar, goreng, es teh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
            </div>
            {activeShift && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{activeShift.shift_name}</span>
              </div>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingMenus ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <div key={n} className="h-44 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredMenus.map((menu) => (
                <div
                  key={menu.id}
                  onClick={() => handleDirectAddToCart(menu)}
                  className={`relative flex flex-col rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                    Boolean(menu.is_in_stock)
                      ? 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-lg hover:-translate-y-0.5'
                      : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {/* Instant Food Visual with local disk D real photos */}
                  <div className="relative">
                    <FoodThumbnail code={menu.code} name={menu.name} category={menu.category} imageUrl={menu.image_url} />
                    
                    {Boolean(menu.is_favorite) && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center gap-1 shadow z-10">
                        <Pin className="w-3 h-3 fill-current" />
                        <span>Favorit</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold z-10">
                      {Boolean(menu.is_in_stock) ? `Stok ~${menu.max_portion_available} porsi` : 'Habis'}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2">
                        {menu.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{menu.description}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-extrabold text-xs sm:text-sm text-blue-700">
                        {formatRupiah(menu.sell_price)}
                      </span>
                      <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                        +
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Cart Section */}
      <div className="w-full lg:w-96 flex flex-col h-full bg-white shadow-xl z-20">
        {/* Order Setup */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <h3 className="font-extrabold text-sm text-slate-800">Keranjang Pesanan</h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {cart.reduce((s, i) => s + i.qty, 0)} Item
            </span>
          </div>

          {/* Dine-In / Takeaway Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-xl text-xs font-bold">
            <button
              onClick={() => setOrderType('DINE_IN')}
              className={`py-1.5 rounded-lg transition ${orderType === 'DINE_IN' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
            >
              Makan Sini
            </button>
            <button
              onClick={() => setOrderType('TAKEAWAY')}
              className={`py-1.5 rounded-lg transition ${orderType === 'TAKEAWAY' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
            >
              Bungkus
            </button>
          </div>

          <div className="flex gap-2">
            {orderType === 'DINE_IN' && (
              <select
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-1/2 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500"
              >
                {['Meja 01', 'Meja 02', 'Meja 03', 'Meja 04', 'Meja 05', 'Meja 06', 'Meja Lesehan 1', 'Meja Lesehan 2'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
            <input
              type="text"
              placeholder="Nama Pelanggan"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="text-4xl mb-2">🍗</div>
              <p className="text-xs font-bold text-slate-600">Keranjang masih kosong</p>
              <p className="text-[11px] text-slate-400 mt-1">Klik menu ayam bakar / minuman untuk menambah pesanan</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="py-3 flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h5 className="font-bold text-xs text-slate-900 leading-snug">{item.name}</h5>
                  <div className="text-[10px] text-blue-700 font-semibold mt-0.5">
                    {item.spicyLevel} • {item.sweetnessLevel}
                  </div>
                  {item.notes && (
                    <div className="text-[10px] text-slate-500 italic">Catatan: {item.notes}</div>
                  )}
                  <div className="font-extrabold text-xs text-slate-800 mt-1">
                    {formatRupiah(item.unitPrice * item.qty)}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => updateCartQty(idx, -1)}
                    className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-slate-700 hover:bg-blue-100 text-xs shadow-sm"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center text-xs font-bold text-slate-800">{item.qty}</span>
                  <button
                    onClick={() => updateCartQty(idx, 1)}
                    className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-slate-700 hover:bg-blue-100 text-xs shadow-sm"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeCartItem(idx)}
                    className="p-1 rounded-lg text-red-500 hover:bg-red-50 text-xs ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Checkout Summary */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-bold text-slate-800">{formatRupiah(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Diskon:</span>
                <span>-{formatRupiah(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-base text-slate-900 pt-1 border-t border-slate-200">
              <span>Total Tagihan:</span>
              <span className="text-blue-700">{formatRupiah(totalAmount)}</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (cart.length === 0) return;
              setShowPaymentModal(true);
            }}
            disabled={cart.length === 0}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-sm disabled:opacity-50 transition"
          >
            Bayar Sekarang ({formatRupiah(totalAmount)})
          </button>
        </div>
      </div>

      {/* Payment Modal (Cash, QRIS, Transfer) */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-lg">Penyelesaian Pembayaran</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition ${
                  paymentMethod === 'CASH'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm font-black'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600 font-medium'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-600" />
                <span className="text-xs">Tunai (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('QRIS')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition ${
                  paymentMethod === 'QRIS'
                    ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm font-black'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600 font-medium'
                }`}
              >
                <QrCode className="w-5 h-5 text-blue-600" />
                <span className="text-xs">QRIS Dinamis</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('TRANSFER')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition ${
                  paymentMethod === 'TRANSFER'
                    ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm font-black'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600 font-medium'
                }`}
              >
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span className="text-xs">Transfer Bank</span>
              </button>
            </div>

            {/* Total Display */}
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex justify-between items-center">
              <div>
                <span className="text-xs text-blue-800 font-semibold">Total Tagihan Bersih:</span>
                <div className="text-2xl font-black text-blue-900">{formatRupiah(totalAmount)}</div>
              </div>
              <div className="text-right text-xs text-blue-700">
                <span>{cart.reduce((s, i) => s + i.qty, 0)} item pesanan</span>
              </div>
            </div>

            {/* Method Details */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nominal Uang Tunai Diterima:
                </label>
                <input
                  type="number"
                  placeholder="Masukkan nominal cash..."
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-black text-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />

                {/* Quick nominal buttons */}
                <div className="flex gap-2">
                  {[totalAmount, 20000, 50000, 100000].filter(v => v >= totalAmount).map((nom) => (
                    <button
                      key={nom}
                      type="button"
                      onClick={() => setCashAmount(nom)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                    >
                      {nom === totalAmount ? 'Uang Pas' : formatRupiah(nom)}
                    </button>
                  ))}
                </div>

                {parseFloat(cashAmount || 0) >= totalAmount && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-sm font-bold text-emerald-900">
                    <span>Kembalian Kasir:</span>
                    <span className="text-base text-emerald-700">{formatRupiah(changeAmount)}</span>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'QRIS' && (
              <div className="p-4 rounded-2xl border border-dashed border-blue-300 bg-blue-50/50 flex flex-col items-center text-center space-y-3">
                <QrCodeSvg value={`AYAM_BANG_ARIF_${totalAmount}`} size={130} />
                <div className="text-xs text-slate-600">
                  <div className="font-bold text-slate-900">Scan via BCA, Gopay, OVO, Dana, ShopeePay</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Integrasi Payment Gateway Otomatis (Midtrans / Xendit)</p>
                </div>
                <button
                  type="button"
                  onClick={() => alert('Simulasi: Notifikasi pembayaran QRIS berhasil diverifikasi sistem!')}
                  className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold"
                >
                  ✓ Simulasi Sinyal QRIS Sukses
                </button>
              </div>
            )}

            {paymentMethod === 'TRANSFER' && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-800">Rekening Resmi Warung Bang Arif:</div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-white border border-slate-200">
                  <span>Bank Central Asia (BCA): <strong>1480-9988-21</strong> a.n Arif Wibowo</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-white border border-slate-200">
                  <span>Bank Mandiri: <strong>139-00-98218-01</strong> a.n Warung Bang Arif</span>
                </div>
              </div>
            )}

            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={processingOrder || (paymentMethod === 'CASH' && parseFloat(cashAmount || 0) < totalAmount)}
                onClick={handleCheckout}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-200 disabled:opacity-50 transition"
              >
                {processingOrder ? 'Memproses...' : 'Konfirmasi & Selesai'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital & Thermal Receipt Modal */}
      {completedReceipt && (
        <ReceiptModal
          receiptData={completedReceipt}
          onClose={() => setCompletedReceipt(null)}
        />
      )}
    </div>
  );
}