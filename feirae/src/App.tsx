import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bike,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Heart,
  MapPin,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  X,
} from "lucide-react";

type Category = { name: string; emoji: string };
type Product = {
  id: number;
  name: string;
  vendor: string;
  fair: string;
  price: number;
  category: string;
  emoji: string;
};

const categories: Category[] = [
  { name: "Hortifruti", emoji: "🥬" },
  { name: "Carnes", emoji: "🥩" },
  { name: "Queijos", emoji: "🧀" },
  { name: "Doces", emoji: "🍰" },
  { name: "Comidas", emoji: "🍲" },
  { name: "Moda", emoji: "👕" },
  { name: "Artesanato", emoji: "🧶" },
  { name: "Casa", emoji: "🏠" },
  { name: "Plantas", emoji: "🪴" },
  { name: "Presentes", emoji: "🎁" },
];

const products: Product[] = [
  { id: 1, name: "Cesta de frutas", vendor: "Sítio da Vó", fair: "Feira do Produtor", price: 24.9, category: "Hortifruti", emoji: "🍎" },
  { id: 2, name: "Queijo artesanal", vendor: "Queijaria do Cerrado", fair: "Feira do Produtor", price: 32, category: "Queijos", emoji: "🧀" },
  { id: 3, name: "Bolo de milho", vendor: "Delícias da Feira", fair: "Feira Central", price: 18, category: "Doces", emoji: "🌽" },
  { id: 4, name: "Cesta de pães", vendor: "Forno da Praça", fair: "Feira Central", price: 21.5, category: "Comidas", emoji: "🥖" },
  { id: 5, name: "Planta ornamental", vendor: "Verde Cerrado", fair: "Feira de Artesanato", price: 28, category: "Plantas", emoji: "🪴" },
  { id: 6, name: "Bolsa artesanal", vendor: "Mãos do DF", fair: "Feira de Artesanato", price: 69.9, category: "Artesanato", emoji: "👜" },
];

const fairs = [
  { name: "Feira do Produtor", place: "DF", status: "Aberta agora", vendors: 48, distance: "2,4 km" },
  { name: "Feira Central", place: "DF", status: "Aberta agora", vendors: 31, distance: "4,8 km" },
  { name: "Feira de Artesanato", place: "DF", status: "Abre às 18h", vendors: 22, distance: "6,1 km" },
];

export default function App() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [showCart, setShowCart] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  const filteredProducts = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    return products.filter((product) => {
      const matchesCategory = category === "Todos" || product.category === category;
      const matchesQuery =
        !normalized ||
        product.name.toLowerCase().includes(normalized) ||
        product.vendor.toLowerCase().includes(normalized) ||
        product.fair.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  const cartItems = products.filter((product) => cart[product.id]);
  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const cartTotal = cartItems.reduce((sum, product) => sum + product.price * cart[product.id], 0);

  function addToCart(productId: number) {
    setCart((current) => ({ ...current, [productId]: (current[productId] ?? 0) + 1 }));
  }

  function removeFromCart(productId: number) {
    setCart((current) => {
      const next = { ...current };
      if (!next[productId]) return next;
      if (next[productId] === 1) delete next[productId];
      else next[productId] -= 1;
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#f7f8f3] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <button onClick={() => setActiveTab("home")} className="shrink-0 text-left">
            <div className="text-2xl font-black tracking-tight text-green-700">Feiraê<span className="text-amber-500">.</span></div>
            <div className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:block">A feira do seu jeito</div>
          </button>

          <button className="hidden items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold md:flex">
            <MapPin size={16} className="text-green-700" />
            Brasília, DF
          </button>

          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="O que você procura na feira?"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-green-500 focus:bg-white"
            />
          </div>

          <button className="hidden rounded-full p-2 text-slate-600 hover:bg-slate-100 sm:block">
            <CircleUserRound />
          </button>

          <button
            onClick={() => setShowCart(true)}
            className="relative rounded-2xl bg-green-700 p-3 text-white shadow-sm transition hover:bg-green-800"
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-black text-slate-900">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6">
        {activeTab === "home" && (
          <>
            <section className="relative overflow-hidden rounded-[2rem] bg-green-800 p-7 text-white shadow-lg sm:p-10">
              <div className="relative z-10 max-w-2xl">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider">Marketplace das feiras do DF</span>
                <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Tudo que você encontra na feira, no seu celular.</h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-green-50 sm:text-base">
                  Descubra feirantes, produtos e feiras perto de você. Compre para receber em casa ou retirar.
                </p>
                <button
                  onClick={() => document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" })}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950"
                >
                  Explorar produtos <ArrowRight size={17} />
                </button>
              </div>
              <div className="absolute -right-10 -top-16 text-[11rem] opacity-20">🧺</div>
              <div className="absolute -bottom-10 right-28 text-7xl opacity-20">🥬</div>
            </section>

            <section className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black">Categorias</h2>
                <button onClick={() => setCategory("Todos")} className="text-sm font-bold text-green-700">Ver todas</button>
              </div>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                {categories.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => setCategory(item.name)}
                    className={`rounded-2xl border p-3 text-center transition ${category === item.name ? "border-green-600 bg-green-50" : "border-slate-200 bg-white hover:border-green-300"}`}
                  >
                    <div className="text-2xl">{item.emoji}</div>
                    <div className="mt-1 truncate text-[11px] font-bold">{item.name}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black">Feiras em destaque</h2>
                  <p className="text-sm text-slate-500">Onde comprar hoje</p>
                </div>
                <button className="flex items-center gap-1 text-sm font-bold text-green-700">Ver todas <ChevronRight size={16} /></button>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {fairs.map((fair) => (
                  <article key={fair.name} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex h-32 items-end bg-gradient-to-br from-green-100 via-lime-50 to-amber-50 p-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">🧺</div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black">{fair.name}</h3>
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={13} /> {fair.place} · {fair.distance}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black ${fair.status.startsWith("Aberta") ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{fair.status}</span>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>{fair.vendors} feirantes</span>
                        <button className="text-green-700">Explorar →</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section id="produtos" className="mt-10">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">Produtos perto de você</h2>
                  <p className="text-sm text-slate-500">{category === "Todos" ? "Uma amostra do que a feira tem para oferecer" : `Categoria: ${category}`}</p>
                </div>
                {category !== "Todos" && (
                  <button onClick={() => setCategory("Todos")} className="text-sm font-bold text-green-700">Limpar filtro</button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {filteredProducts.map((product) => (
                  <article key={product.id} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="relative flex aspect-square items-center justify-center bg-gradient-to-br from-lime-50 to-amber-50 text-6xl">
                      {product.emoji}
                      <button className="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-slate-500 shadow-sm"><Heart size={15} /></button>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-[11px] font-bold text-green-700">{product.vendor}</p>
                      <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-black">{product.name}</h3>
                      <p className="mt-1 text-[11px] text-slate-400">{product.fair}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <strong className="text-base">R$ {product.price.toFixed(2).replace(".", ",")}</strong>
                        <button onClick={() => addToCart(product.id)} className="rounded-xl bg-green-700 p-2 text-white hover:bg-green-800" aria-label={`Adicionar ${product.name}`}>
                          <Plus size={17} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                  <div className="text-4xl">🔎</div>
                  <h3 className="mt-3 font-black">Nenhum produto encontrado</h3>
                  <p className="mt-1 text-sm text-slate-500">Tente outro termo ou categoria.</p>
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === "orders" && (
          <section className="mx-auto max-w-2xl py-16 text-center">
            <Package className="mx-auto text-green-700" size={42} />
            <h1 className="mt-4 text-2xl font-black">Meus pedidos</h1>
            <p className="mt-2 text-sm text-slate-500">Seus pedidos e o acompanhamento da entrega aparecerão aqui.</p>
          </section>
        )}

        {activeTab === "profile" && (
          <section className="mx-auto max-w-2xl py-16 text-center">
            <CircleUserRound className="mx-auto text-green-700" size={42} />
            <h1 className="mt-4 text-2xl font-black">Meu perfil</h1>
            <p className="mt-2 text-sm text-slate-500">Endereços, favoritos, pagamentos e preferências.</p>
          </section>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-2 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          <button onClick={() => setActiveTab("home")} className={`rounded-xl py-2 text-xs font-bold ${activeTab === "home" ? "bg-green-50 text-green-700" : "text-slate-500"}`}>Início</button>
          <button onClick={() => setActiveTab("orders")} className={`rounded-xl py-2 text-xs font-bold ${activeTab === "orders" ? "bg-green-50 text-green-700" : "text-slate-500"}`}>Pedidos</button>
          <button onClick={() => setActiveTab("profile")} className={`rounded-xl py-2 text-xs font-bold ${activeTab === "profile" ? "bg-green-50 text-green-700" : "text-slate-500"}`}>Perfil</button>
        </div>
      </nav>

      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
          <aside className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-black">Minha Feira</h2>
                <p className="text-xs text-slate-500">{cartCount} item(ns)</p>
              </div>
              <button onClick={() => setShowCart(false)} className="rounded-full bg-slate-100 p-2"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-auto p-5">
              {cartItems.length === 0 ? (
                <div className="py-20 text-center">
                  <ShoppingBag className="mx-auto text-slate-300" size={48} />
                  <h3 className="mt-4 font-black">Sua sacola está vazia</h3>
                  <p className="mt-1 text-sm text-slate-500">Adicione produtos das feiras para começar.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((product) => (
                    <div key={product.id} className="rounded-2xl border border-slate-200 p-3">
                      <div className="flex gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-lime-50 text-2xl">{product.emoji}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between gap-2">
                            <div>
                              <p className="text-sm font-black">{product.name}</p>
                              <p className="text-[11px] text-slate-500">{product.vendor}</p>
                            </div>
                            <button onClick={() => removeFromCart(product.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={15} /></button>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <strong>R$ {(product.price * cart[product.id]).toFixed(2).replace(".", ",")}</strong>
                            <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1">
                              <button onClick={() => removeFromCart(product.id)} className="rounded-lg p-1 hover:bg-white"><Minus size={14} /></button>
                              <span className="w-5 text-center text-xs font-black">{cart[product.id]}</span>
                              <button onClick={() => addToCart(product.id)} className="rounded-lg p-1 hover:bg-white"><Plus size={14} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="border-t p-5">
                <div className="mb-2 flex justify-between text-sm"><span className="text-slate-500">Produtos</span><strong>R$ {cartTotal.toFixed(2).replace(".", ",")}</strong></div>
                <div className="mb-4 flex justify-between text-sm"><span className="text-slate-500">Entrega</span><span className="font-bold text-green-700">A calcular</span></div>
                <button className="w-full rounded-2xl bg-green-700 py-4 font-black text-white hover:bg-green-800">
                  Continuar para checkout
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
