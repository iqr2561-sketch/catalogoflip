import { create } from 'zustand';

const useCartStore = create((set) => ({
  productos: [],
  
  agregarProducto: (producto, cantidad = 1) => {
    set((state) => {
      // Crear una clave única basada en ID y variaciones seleccionadas
      const variacionesKey = producto.variacionesSeleccionadas 
        ? JSON.stringify(producto.variacionesSeleccionadas)
        : '';
      const claveUnica = `${producto.id}_${variacionesKey}`;
      
      // Verificar si el producto con las mismas variaciones ya existe en el carrito
      const existe = state.productos.find((p) => {
        const pVariacionesKey = p.variacionesSeleccionadas 
          ? JSON.stringify(p.variacionesSeleccionadas)
          : '';
        return `${p.id}_${pVariacionesKey}` === claveUnica;
      });
      
      if (existe) {
        // Si existe, incrementar la cantidad
        return {
          productos: state.productos.map((p) => {
            const pVariacionesKey = p.variacionesSeleccionadas 
              ? JSON.stringify(p.variacionesSeleccionadas)
              : '';
            return `${p.id}_${pVariacionesKey}` === claveUnica
              ? { ...p, cantidad: (p.cantidad || 1) + (cantidad || 1) }
              : p;
          }),
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

