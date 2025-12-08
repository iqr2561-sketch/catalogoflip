import { create } from 'zustand';

const useCartStore = create((set) => ({
  productos: [],
  
  agregarProducto: (producto, cantidad = 1) => {
    set((state) => {
      // Verificar si el producto ya existe en el carrito
      const existe = state.productos.find((p) => p.id === producto.id);
      
      if (existe) {
        // Si existe, incrementar la cantidad
        return {
          productos: state.productos.map((p) =>
            p.id === producto.id
              ? { ...p, cantidad: (p.cantidad || 1) + (cantidad || 1) }
              : p
          ),
        };
      } else {
        // Si no existe, agregarlo con cantidad 1
        return {
          productos: [...state.productos, { ...producto, cantidad: Math.max(1, cantidad || 1) }],
        };
      }
    });
  },
  
  eliminarProducto: (productoId) => {
    set((state) => ({
      productos: state.productos.filter((p) => p.id !== productoId),
    }));
  },
  
  actualizarCantidad: (productoId, cantidad) => {
    set((state) => ({
      productos: state.productos.map((p) =>
        p.id === productoId ? { ...p, cantidad: Math.max(1, cantidad) } : p
      ),
    }));
  },
  
  limpiarCarrito: () => {
    set({ productos: [] });
  },
  
  getTotal: () => {
    const state = useCartStore.getState();
    return state.productos.reduce((total, producto) => {
      return total + producto.precio * (producto.cantidad || 1);
    }, 0);
  },
}));

export default useCartStore;

