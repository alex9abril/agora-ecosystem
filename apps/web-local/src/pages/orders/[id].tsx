import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { ordersService, Order, OrderItem } from '@/lib/orders';
import { productsService, Product } from '@/lib/products';
import { walletService, WalletTransaction } from '@/lib/wallet';
import { logisticsService, ShippingLabel } from '@/lib/logistics';

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { selectedBusiness } = useSelectedBusiness();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [walletPaymentTransactions, setWalletPaymentTransactions] = useState<WalletTransaction[]>([]);
  const [loadingWalletTransactions, setLoadingWalletTransactions] = useState(false);
  const [shippingLabel, setShippingLabel] = useState<ShippingLabel | null>(null);
  const [loadingShippingLabel, setLoadingShippingLabel] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    if (id && router.isReady) {
      // Si hay tienda seleccionada, usar esa. Si no, intentar obtener el business_id del pedido desde sessionStorage
      const businessId = selectedBusiness?.business_id || sessionStorage.getItem('temp_order_business_id');
      if (businessId) {
        loadOrder(businessId);
      } else {
        setLoading(false);
        setError('No se pudo determinar la tienda del pedido');
      }
    }
  }, [id, selectedBusiness?.business_id, router.isReady]);

  const loadOrder = async (businessId: string) => {
    if (!id || !businessId) return;

    try {
      setLoading(true);
      setError(null);
      console.log('🔵 [LOAD ORDER] Cargando pedido:', {
        orderId: id,
        businessId,
        source: selectedBusiness?.business_id ? 'selectedBusiness' : 'sessionStorage',
      });
      
      const orderData = await ordersService.getOrder(businessId, id as string);
      console.log('🔵 [LOAD ORDER] Pedido cargado exitosamente:', {
        orderId: orderData.id,
        businessId: orderData.business_id,
        status: orderData.status,
        payment_status: orderData.payment_status,
      });
      
      setOrder(orderData);
      
      // Debug: Verificar payment_transactions
      console.log('💰 [LOAD ORDER] payment_transactions recibidas:', orderData.payment_transactions);
      console.log('💰 [LOAD ORDER] Cantidad de transacciones:', orderData.payment_transactions?.length || 0);

      // Cargar información de productos para obtener imágenes y SKUs
      if (orderData.items && orderData.items.length > 0) {
        const productIds = orderData.items
          .map(item => item.product_id)
          .filter((id): id is string => id !== undefined && id !== null);
        
        if (productIds.length > 0) {
          try {
            const productsMap: Record<string, Product> = {};
            // Cargar productos uno por uno o en batch si hay endpoint
            await Promise.all(
              productIds.map(async (productId) => {
                try {
                  const product = await productsService.getProduct(productId);
                  console.log(`📦 Producto cargado:`, {
                    productId,
                    productName: product.name,
                    hasPrimaryImage: !!product.primary_image_url,
                    hasImageUrl: !!product.image_url,
                    primaryImageUrl: product.primary_image_url,
                    imageUrl: product.image_url,
                  });
                  productsMap[productId] = product;
                } catch (err) {
                  console.error(`Error cargando producto ${productId}:`, err);
                }
              })
            );
            setProducts(productsMap);
            console.log(`✅ Productos cargados:`, Object.keys(productsMap).length);
          } catch (err) {
            console.error('Error cargando productos:', err);
            // No fallar la carga de la orden si hay error cargando productos
          }
        }
      }

      // Cargar transacciones del wallet del cliente relacionadas con este pedido
      if (orderData.client_id) {
        try {
          setLoadingWalletTransactions(true);
          console.log('💰 [WALLET] Cargando transacciones del wallet del cliente:', orderData.client_id, 'para pedido:', orderData.id);
          const transactionsResponse = await walletService.getTransactionsByUserId(orderData.client_id, {
            page: 1,
            limit: 50,
          });
          console.log('💰 [WALLET] Total de transacciones obtenidas:', transactionsResponse.data.length);
          
          // Filtrar transacciones relacionadas con este pedido
          const allOrderTransactions = transactionsResponse.data.filter(
            tx => tx.order_id === orderData.id
          );
          
          // Separar créditos (acreditaciones) y débitos (pagos)
          const creditTransactions = allOrderTransactions.filter(
            tx => tx.transaction_type === 'credit'
          );
          const paymentTransactions = allOrderTransactions.filter(
            tx => tx.transaction_type === 'payment' || tx.transaction_type === 'debit'
          );
          
          console.log('💰 [WALLET] Créditos relacionados con este pedido:', creditTransactions.length);
          console.log('💰 [WALLET] Pagos relacionados con este pedido:', paymentTransactions.length);
          console.log('💰 [WALLET] Detalles de transacciones:', allOrderTransactions);
          
          setWalletTransactions(creditTransactions);
          setWalletPaymentTransactions(paymentTransactions);
        } catch (err) {
          console.error('❌ [WALLET] Error cargando transacciones de wallet:', err);
          // No fallar la carga de la orden si hay error cargando transacciones
          setWalletTransactions([]);
        } finally {
          setLoadingWalletTransactions(false);
        }
      }

      // Cargar guía de envío si la orden está en estado in_transit o superior
      if (orderData.status === 'in_transit' || orderData.status === 'delivered') {
        try {
          setLoadingShippingLabel(true);
          const label = await logisticsService.getShippingLabelByOrderId(orderData.id);
          if (label) {
            setShippingLabel(label);
            console.log('📦 [SHIPPING LABEL] Guía de envío cargada:', label.tracking_number);
          } else {
            setShippingLabel(null);
            console.log('📦 [SHIPPING LABEL] No hay guía de envío para esta orden');
          }
        } catch (err) {
          console.error('❌ [SHIPPING LABEL] Error cargando guía de envío:', err);
          // No fallar la carga de la orden si hay error cargando la guía
          setShippingLabel(null);
        } finally {
          setLoadingShippingLabel(false);
        }
      }
    } catch (err: any) {
      console.error('❌ [LOAD ORDER] Error cargando pedido:', err);
      console.error('❌ [LOAD ORDER] Detalles del error:', {
        message: err.message,
        statusCode: err.statusCode,
        orderId: id,
        businessId,
      });
      
      if (err.statusCode === 404) {
        setError('Pedido no encontrado. Puede que haya sido eliminado o no pertenezca a esta tienda.');
      } else {
        setError(`Error al cargar el pedido: ${err.message || 'Error desconocido'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!order) return;
    
    // Confirmar acción
    if (!confirm('¿Confirmar que el pago ha sido recibido? Esta acción cambiará el estado de pago a "Pagado".')) {
      return;
    }
    
    // Obtener business_id: primero de selectedBusiness, luego de sessionStorage, luego del order
    const businessId = selectedBusiness?.business_id || 
                       sessionStorage.getItem('temp_order_business_id') || 
                       order.business_id;
    
    if (!businessId) {
      alert('No se pudo determinar la tienda del pedido');
      return;
    }

    try {
      setUpdating(true);
      
      console.log('🔵 [CONFIRMAR PAGO] Iniciando confirmación de pago...');
      console.log('🔵 [CONFIRMAR PAGO] Order ID:', order.id);
      console.log('🔵 [CONFIRMAR PAGO] Business ID:', businessId);
      console.log('🔵 [CONFIRMAR PAGO] Payment status actual:', order.payment_status);
      
      const updatedOrder = await ordersService.updatePaymentStatus(businessId, order.id, {
        payment_status: 'paid',
      });
      
      console.log('🔵 [CONFIRMAR PAGO] Respuesta del backend (tipo):', typeof updatedOrder);
      console.log('🔵 [CONFIRMAR PAGO] Respuesta del backend (completa):', JSON.stringify(updatedOrder, null, 2));
      
      // Verificar si la respuesta tiene payment_status
      const paymentStatusInResponse = updatedOrder?.payment_status || (updatedOrder as any)?.data?.payment_status;
      console.log('🔵 [CONFIRMAR PAGO] Payment status en respuesta:', paymentStatusInResponse);
      
      // Siempre esperar un momento para que la transacción se complete en la BD
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recargar el pedido para actualizar la UI
      console.log('🔄 [CONFIRMAR PAGO] Recargando pedido...');
      await loadOrder(businessId);
      
      // Verificar el estado actualizado directamente desde la BD
      const reloadedOrder = await ordersService.getOrder(businessId, order.id);
      console.log('🔵 [CONFIRMAR PAGO] Order recargado - payment_status:', reloadedOrder.payment_status);
      console.log('🔵 [CONFIRMAR PAGO] Order recargado - estado completo:', JSON.stringify(reloadedOrder, null, 2));
      
      if (reloadedOrder.payment_status === 'paid') {
        console.log('✅ [CONFIRMAR PAGO] Pago confirmado exitosamente en la base de datos');
        alert('Pago confirmado exitosamente');
      } else {
        console.error('❌ [CONFIRMAR PAGO] El pago NO se actualizó en la base de datos');
        console.error('❌ [CONFIRMAR PAGO] Estado esperado: paid');
        console.error('❌ [CONFIRMAR PAGO] Estado actual:', reloadedOrder.payment_status);
        console.error('❌ [CONFIRMAR PAGO] Respuesta del backend fue:', updatedOrder);
        console.error('❌ [CONFIRMAR PAGO] Payment status en respuesta fue:', paymentStatusInResponse);
        
        // Verificar si el backend al menos reportó éxito
        if (paymentStatusInResponse === 'paid') {
          alert('El backend reportó éxito, pero el estado no se actualizó en la base de datos. Por favor, recarga la página manualmente.');
        } else {
          alert('Error: El pago no se actualizó correctamente. Por favor, revisa los logs en la consola y contacta al administrador.');
        }
      }
    } catch (err: any) {
      console.error('❌ [CONFIRMAR PAGO] Error confirmando pago:', err);
      console.error('❌ [CONFIRMAR PAGO] Error completo:', JSON.stringify(err, null, 2));
      alert(err.message || 'Error al confirmar el pago. Por favor, revisa la consola para más detalles.');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string, requiresConfirmation: boolean = false) => {
    if (!order) return;
    
    // Si requiere confirmación, preguntar al usuario
    if (requiresConfirmation) {
      const confirmMessage = newStatus === 'cancelled' 
        ? '¿Estás seguro de que deseas cancelar este pedido? Esta acción puede requerir un reembolso.'
        : `¿Estás seguro de cambiar el estado a "${newStatus}"?`;
      
      if (!confirm(confirmMessage)) {
        return;
      }
    }
    
    // Obtener business_id: primero de selectedBusiness, luego de sessionStorage, luego del order
    const businessId = selectedBusiness?.business_id || 
                       sessionStorage.getItem('temp_order_business_id') || 
                       order.business_id;
    
    if (!businessId) {
      alert('No se pudo determinar la tienda del pedido');
      return;
    }

    try {
      setUpdating(true);
      
      // Si es cancelación, pedir razón
      let cancellationReason = null;
      if (newStatus === 'cancelled') {
        cancellationReason = prompt('Por favor, proporciona una razón para la cancelación (opcional):');
        if (cancellationReason === null) {
          // Usuario canceló el prompt
          setUpdating(false);
          return;
        }
      }
      
      await ordersService.updateOrderStatus(businessId, order.id, {
        status: newStatus,
        cancellation_reason: cancellationReason || undefined,
      });
      await loadOrder(businessId);
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      alert(err.message || 'Error al actualizar el estado del pedido');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!order) return;

    // Confirmar eliminación
    if (!confirm('⚠️ ¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer.')) {
      return;
    }

    // Obtener business_id: primero de selectedBusiness, luego de sessionStorage, luego del order
    const businessId = selectedBusiness?.business_id || 
                       sessionStorage.getItem('temp_order_business_id') || 
                       order.business_id;
    
    if (!businessId) {
      alert('No se pudo determinar la tienda del pedido');
      return;
    }

    try {
      setDeleting(true);
      await ordersService.deleteOrder(businessId, order.id);
      alert('Pedido eliminado exitosamente');
      // Redirigir a la lista de pedidos
      router.push('/orders');
    } catch (err: any) {
      console.error('Error eliminando pedido:', err);
      alert('Error al eliminar el pedido: ' + (err.message || 'Error desconocido'));
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return date.toLocaleDateString('es-MX', options);
  };

  // Función para obtener el icono según el estado
  const getStatusIcon = (status: string, completed: boolean) => {
    if (completed) {
      // Iconos para estados completados (verde con check)
      switch (status) {
        case 'pending':
          return (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          );
        case 'confirmed':
          return (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        case 'completed':
          return (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        case 'in_transit':
          return (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          );
        case 'delivered':
          return (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          );
        default:
          return (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          );
      }
    } else {
      // Iconos para estados pendientes (gris)
      switch (status) {
        case 'pending':
          return (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          );
        case 'confirmed':
          return (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        case 'completed':
          return (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        case 'in_transit':
          return (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          );
        case 'delivered':
          return (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          );
        default:
          return null;
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const getStatusTimeline = (orderData: Order) => {
    if (!orderData) return [];

    // Definir todos los estados posibles en orden (flujo simplificado)
    const allStates = [
      { status: 'pending', label: 'Pedido creado', dateField: 'created_at' },
      { status: 'confirmed', label: 'Pedido confirmado', dateField: 'confirmed_at' },
      { status: 'completed', label: 'Pedido completado', dateField: 'completed_at' },
      { status: 'in_transit', label: 'En tránsito', dateField: 'in_transit_at' },
      { status: 'delivered', label: 'Entregado', dateField: 'delivered_at' },
    ];

    // Determinar qué estados están completados
    const statusOrder = ['pending', 'confirmed', 'completed', 'in_transit', 'delivered'];
    const currentIndex = statusOrder.indexOf(orderData.status);
    
    // Si está cancelado o reembolsado, mostrar hasta donde llegó
    const isCancelled = orderData.status === 'cancelled';
    const isRefunded = orderData.status === 'refunded';

    const timeline = allStates.map((state, index) => {
      const isCompleted = currentIndex >= index && !isCancelled && !isRefunded;
      const isCurrent = currentIndex === index && !isCancelled && !isRefunded;
      const date = (orderData as any)[state.dateField] || null;

      return {
        status: state.status,
        label: state.label,
        date: date,
        completed: isCompleted,
        current: isCurrent,
      };
    });

    // Si está en delivery_failed, agregar estado (usando cast a any ya que puede venir del backend)
    if ((orderData as any).status === 'delivery_failed') {
      timeline.push({
        status: 'delivery_failed',
        label: 'Entrega fallida',
        date: (orderData as any).delivery_failed_at || null,
        completed: true,
        current: true,
      });
    }

    // Si está devuelto, agregar estado (usando cast a any ya que puede venir del backend)
    if ((orderData as any).status === 'returned') {
      timeline.push({
        status: 'returned',
        label: 'Devuelto',
        date: (orderData as any).returned_at || null,
        completed: true,
        current: true,
      });
    }

    // Si está cancelado, agregar estado de cancelación
    if (isCancelled) {
      timeline.push({
        status: 'cancelled',
        label: 'Cancelado',
        date: (orderData as any).cancelled_at || null,
        completed: true,
        current: true,
      });
    }

    // Si está reembolsado, agregar estado de reembolso
    if (isRefunded) {
      timeline.push({
        status: 'refunded',
        label: 'Reembolsado',
        date: (orderData as any).refunded_at || null,
        completed: true,
        current: true,
      });
    }

    return timeline;
  };

  const getNextActions = (orderData: Order) => {
    if (!orderData) return [];

    const actions: Array<{ 
      status: string; 
      label: string; 
      color: string; 
      isPrimary: boolean;
      requiresConfirmation?: boolean;
      isPaymentAction?: boolean; // Indica si es una acción de pago
      isNavigationAction?: boolean; // Indica que debe navegar en lugar de cambiar estado
    }> = [];

    // Definir acciones según el estado actual
    // Usar cast a any para permitir estados que pueden venir del backend pero no están en el tipo
    const orderStatus = (orderData as any).status || orderData.status;
    switch (orderStatus) {
      case 'pending':
        // Botón para confirmar pedido (solo si el pago está verificado)
        if (orderData.payment_status === 'paid') {
          actions.push({ 
            status: 'confirmed', 
            label: 'Confirmar pedido', 
            color: 'bg-black hover:bg-gray-800 text-white', 
            isPrimary: true 
          });
        }
        actions.push({ 
          status: 'cancelled', 
          label: 'Cancelar pedido', 
          color: 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300', 
          isPrimary: false,
          requiresConfirmation: true
        });
        break;
      
      case 'confirmed':
        // Botón para ir a la interfaz de preparación/surtido
        actions.push({ 
          status: 'prepare', 
          label: 'Surtir pedido', 
          color: 'bg-black hover:bg-gray-800 text-white', 
          isPrimary: true,
          isNavigationAction: true // Indica que debe navegar en lugar de cambiar estado
        });
        actions.push({ 
          status: 'cancelled', 
          label: 'Cancelar pedido', 
          color: 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300', 
          isPrimary: false,
          requiresConfirmation: true
        });
        break;
      
      case 'completed':
        // El pedido está surtido, listo para entregar al proveedor de logística
        // El proveedor tomará control y cambiará a in_transit
        // El negocio solo puede cancelar en casos excepcionales
        actions.push({ 
          status: 'cancelled', 
          label: 'Cancelar pedido (excepcional)', 
          color: 'bg-red-600 hover:bg-red-700 text-white', 
          isPrimary: false,
          requiresConfirmation: true
        });
        break;
      
      case 'in_transit':
        // Estado controlado por proveedor de logística
        // El negocio solo puede cancelar en casos excepcionales
        actions.push({ 
          status: 'cancelled', 
          label: 'Cancelar pedido (excepcional)', 
          color: 'bg-red-600 hover:bg-red-700 text-white', 
          isPrimary: false,
          requiresConfirmation: true
        });
        break;
      
      case 'delivery_failed':
        // Entrega fallida, el proveedor gestiona reintentos o devolución
        // El negocio solo puede cancelar
        actions.push({ 
          status: 'cancelled', 
          label: 'Cancelar pedido', 
          color: 'bg-red-600 hover:bg-red-700 text-white', 
          isPrimary: false,
          requiresConfirmation: true
        });
        break;
      
      case 'delivered':
      case 'cancelled':
      case 'refunded':
        // Estados finales, no hay acciones disponibles
        break;
    }

    return actions;
  };

  if (loading) {
    return (
      <LocalLayout>
        <Head>
          <title>Detalle de pedido - LOCALIA Local</title>
        </Head>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando pedido...</p>
          </div>
        </div>
      </LocalLayout>
    );
  }

  if (error || !order) {
    return (
      <LocalLayout>
        <Head>
          <title>Error - LOCALIA Local</title>
        </Head>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-red-600">{error || 'Pedido no encontrado'}</p>
            <button
              onClick={() => router.push('/orders')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Volver a pedidos
            </button>
          </div>
        </div>
      </LocalLayout>
    );
  }

  // Calcular timeline y acciones después de verificar que order existe
  const timeline = getStatusTimeline(order);
  const nextActions = getNextActions(order);

  return (
    <LocalLayout>
      <Head>
        <title>Pedido #{order.id.slice(-8).toUpperCase()} - LOCALIA Local</title>
      </Head>

      <div className="w-full h-screen flex flex-col overflow-hidden">
        {/* Header fijo */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
          <button
            onClick={() => router.push('/orders')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a pedidos
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Pedido #{order.id.slice(-8).toUpperCase()}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Creado el {formatDate(order.created_at)}
              </p>
            </div>
              <div className="flex items-center gap-3">
                {nextActions.map((action) => (
                  <button
                    key={action.status}
                    onClick={() => {
                      if (action.isPaymentAction) {
                        handleConfirmPayment();
                      } else if (action.isNavigationAction) {
                        // Navegar a la página de preparación
                        router.push(`/orders/${order.id}/prepare`);
                      } else {
                        handleStatusUpdate(action.status, action.requiresConfirmation);
                      }
                    }}
                    disabled={updating}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${action.color} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    {action.label}
                  </button>
                ))}
              {/* ⚠️ Botón temporal para eliminar pedido */}
              <button
                onClick={handleDeleteOrder}
                disabled={deleting || updating}
                className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="⚠️ TEMPORAL: Eliminar pedido"
              >
                {deleting ? 'Eliminando...' : '🗑️ Eliminar'}
              </button>
            </div>
          </div>
        </div>

        {/* Timeline compacto - Barra horizontal con iconos */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 px-6 py-3">
          <div className="flex items-center justify-center gap-2">
            {timeline.map((step, index) => (
              <div key={step.status} className="flex items-center">
                <div className="relative group">
                  {step.completed ? (
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 shadow-sm">
                      {getStatusIcon(step.status, true)}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full border-2 border-gray-300 bg-white cursor-pointer transition-transform hover:scale-110 flex items-center justify-center">
                      {getStatusIcon(step.status, false)}
                    </div>
                  )}
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                      {step.label}
                      {step.date && (
                        <div className="text-gray-400 mt-1">{formatDate(step.date)}</div>
                      )}
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
                {/* Línea conectora */}
                {index < timeline.length - 1 && (
                  <div className={`w-12 h-0.5 mx-1 ${step.completed ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contenedor principal con flex para sidebar fijo y contenido con scroll */}
        <div className="flex-1 flex overflow-hidden">
          {/* Columna principal con scroll */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {/* Items del pedido - Hasta arriba */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Items del pedido</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wide">Producto</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wide">SKU</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wide">Cantidad</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wide">Precio</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wide">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items?.map((item) => {
                        const product = item.product_id ? products[item.product_id] : null;
                        const productImage = product?.primary_image_url || product?.image_url;
                        const productSku = product?.sku || '';
                        
                        // Debug: Log para verificar si el producto tiene imagen
                        if (product && !productImage) {
                          console.log('⚠️ Producto sin imagen:', {
                            productId: product.id,
                            productName: product.name,
                            hasPrimaryImage: !!product.primary_image_url,
                            hasImageUrl: !!product.image_url,
                            product: product,
                          });
                        }
                        
                        return (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                {productImage ? (
                                  <img 
                                    src={productImage} 
                                    alt={item.item_name}
                                    className="w-10 h-10 object-cover rounded flex-shrink-0"
                                    onError={(e) => {
                                      console.error('❌ Error cargando imagen:', productImage);
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      const placeholder = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                                      if (placeholder) {
                                        placeholder.classList.remove('hidden');
                                      }
                                    }}
                                    onLoad={() => {
                                      console.log('✅ Imagen cargada exitosamente:', productImage);
                                    }}
                                  />
                                ) : null}
                                <div className={`w-10 h-10 bg-gray-200 rounded flex-shrink-0 ${productImage ? 'hidden' : ''}`}></div>
                                <span className="text-sm text-gray-900">{item.item_name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-sm text-gray-600">{productSku || '-'}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-sm text-gray-900">
                                {item.quantity}
                                {item.original_quantity && item.original_quantity !== item.quantity && (
                                  <span className="text-xs text-gray-500 ml-1">
                                    (solicitado: {item.original_quantity})
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className="text-sm text-gray-900">{formatCurrency(parseFloat(item.item_price.toString()))}</span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className="text-sm font-medium text-gray-900">{formatCurrency(parseFloat(item.item_subtotal.toString()))}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Guía de envío - Solo mostrar si la orden está en estado completed o superior */}
              {(order.status === 'completed' || order.status === 'in_transit' || order.status === 'delivered') && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Guía de Envío</h2>
                    {shippingLabel && (
                      <button
                        onClick={async () => {
                          try {
                            setDownloadingPDF(true);
                            const blob = await logisticsService.downloadShippingLabelPDF(order.id);
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `guia-envio-${shippingLabel.tracking_number}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);
                          } catch (err: any) {
                            console.error('Error descargando PDF:', err);
                            alert('Error al descargar el PDF: ' + (err.message || 'Error desconocido'));
                          } finally {
                            setDownloadingPDF(false);
                          }
                        }}
                        disabled={downloadingPDF || !shippingLabel}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                      >
                        {downloadingPDF ? (
                          <>
                            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Descargando...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Descargar PDF
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  {loadingShippingLabel ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                      <span className="ml-2 text-xs text-gray-500">Cargando guía de envío...</span>
                    </div>
                  ) : shippingLabel ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Número de Guía</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            shippingLabel.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            shippingLabel.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                            shippingLabel.status === 'picked_up' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {shippingLabel.status === 'delivered' ? 'Entregado' :
                             shippingLabel.status === 'in_transit' ? 'En Tránsito' :
                             shippingLabel.status === 'picked_up' ? 'Recolectado' :
                             'Generada'}
                          </span>
                        </div>
                        <p className="text-lg font-mono font-bold text-blue-900">{shippingLabel.tracking_number}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Transportista</p>
                          <p className="text-gray-900">{shippingLabel.carrier_name}</p>
                        </div>
                        {shippingLabel.package_weight && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Peso</p>
                            <p className="text-gray-900">{shippingLabel.package_weight} kg</p>
                          </div>
                        )}
                        {shippingLabel.package_dimensions && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Dimensiones</p>
                            <p className="text-gray-900">{shippingLabel.package_dimensions}</p>
                          </div>
                        )}
                        {shippingLabel.declared_value && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Valor Declarado</p>
                            <p className="text-gray-900">{formatCurrency(shippingLabel.declared_value)}</p>
                          </div>
                        )}
                      </div>
                      {shippingLabel.picked_up_at && (
                        <div className="text-xs text-gray-500">
                          <span className="font-semibold">Recolectado:</span> {formatDate(shippingLabel.picked_up_at)}
                        </div>
                      )}
                      {shippingLabel.in_transit_at && (
                        <div className="text-xs text-gray-500">
                          <span className="font-semibold">En tránsito:</span> {formatDate(shippingLabel.in_transit_at)}
                        </div>
                      )}
                      {shippingLabel.delivered_at && (
                        <div className="text-xs text-gray-500">
                          <span className="font-semibold">Entregado:</span> {formatDate(shippingLabel.delivered_at)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500 mb-2">No se ha generado la guía de envío aún</p>
                      <button
                        onClick={async () => {
                          try {
                            setLoadingShippingLabel(true);
                            const label = await logisticsService.createShippingLabel({
                              orderId: order.id,
                              packageWeight: 1.0,
                              packageDimensions: '30x20x15 cm',
                              declaredValue: parseFloat(order.subtotal.toString()), // Valor declarado = subtotal (sin envío)
                            });
                            setShippingLabel(label);
                            alert('Guía de envío generada exitosamente');
                          } catch (err: any) {
                            console.error('Error generando guía:', err);
                            alert('Error al generar la guía: ' + (err.message || 'Error desconocido'));
                          } finally {
                            setLoadingShippingLabel(false);
                          }
                        }}
                        disabled={loadingShippingLabel}
                        className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loadingShippingLabel ? 'Generando...' : 'Generar Guía de Envío'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Grid de dos columnas para resúmenes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Resumen de orden */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Resumen de orden</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900">{formatCurrency(parseFloat(order.subtotal.toString()))}</span>
                    </div>
                    {parseFloat(order.delivery_fee.toString()) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Envío</span>
                        <span className="text-gray-900">{formatCurrency(parseFloat(order.delivery_fee.toString()))}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Impuestos</span>
                      <span className="text-gray-900">{formatCurrency(parseFloat(order.tax_amount.toString()))}</span>
                    </div>
                    {parseFloat(order.discount_amount.toString()) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Descuento</span>
                        <span className="text-green-600">-{formatCurrency(parseFloat(order.discount_amount.toString()))}</span>
                      </div>
                    )}
                    {parseFloat(order.tip_amount.toString()) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Propina</span>
                        <span className="text-gray-900">{formatCurrency(parseFloat(order.tip_amount.toString()))}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-gray-200 flex justify-between font-semibold">
                      <span className="text-gray-900">Total</span>
                      <span className="text-gray-900">
                        {formatCurrency(parseFloat(order.total_amount.toString()))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resumen de pago */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Resumen de pago</h2>
                    {/* Botón para confirmar pago - Solo se muestra si hay transacciones pendientes */}
                    {(() => {
                      // Verificar si hay transacciones pendientes
                      const hasPendingTransactions = order.payment_transactions?.some(
                        (tx) => tx.status === 'pending' || tx.status === 'failed'
                      ) || false;
                      
                      // Solo mostrar el botón si hay transacciones pendientes
                      // No mostrar si todas las transacciones están completadas (wallet + karlopay completados)
                      const canShowButton = hasPendingTransactions && 
                        (order.payment_status === 'pending' || order.payment_status === 'failed');
                      
                      return canShowButton ? (
                        <button
                          onClick={handleConfirmPayment}
                          disabled={updating}
                          className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                          title="Confirmar que el pago ha sido recibido"
                        >
                          {updating ? (
                            <>
                              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Confirmando...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Confirmar pago
                            </>
                          )}
                        </button>
                      ) : null;
                    })()}
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Un resumen de todos los pagos de las transacciones registradas</p>
                  <div className="space-y-2 text-sm">
                    <div className="mb-2 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.payment_status === 'paid' || order.payment_status === 'overcharged'
                            ? 'text-green-700 bg-green-50'
                            : order.payment_status === 'failed'
                            ? 'text-red-700 bg-red-50'
                            : 'text-yellow-700 bg-yellow-50'
                        }`}>
                          {order.payment_status === 'paid' ? 'Totalmente Pagado' :
                           order.payment_status === 'overcharged' ? 'Overcharged' :
                           order.payment_status === 'failed' ? 'Fallido' :
                           order.payment_status === 'refunded' ? 'Reembolsado' :
                           'Pendiente'}
                        </span>
                        {order.payment_method && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-700 bg-gray-100">
                            Método: {order.payment_method}
                          </span>
                        )}
                      </div>
                      {order.payment_status_change_info && (
                        <div className="text-xs text-gray-500">
                          {order.payment_status_change_info.is_automatic ? (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Confirmado automáticamente por pasarela de pagos
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              Confirmado por {order.payment_status_change_info.changed_by_name}
                              {order.payment_status_change_info.changed_by_role && ` (${order.payment_status_change_info.changed_by_role})`}
                            </span>
                          )}
                          {order.payment_status_change_info.changed_at && (
                            <span className="ml-1 text-gray-400">
                              • {formatDate(order.payment_status_change_info.changed_at)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pendiente</span>
                  <span className="text-gray-900">MXN 0,00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Autorizado</span>
                  <span className="text-gray-900">{formatCurrency(parseFloat(order.total_amount.toString()))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Capturado</span>
                  <span className="text-gray-900">MXN 0,00</span>
                </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cancelado</span>
                      <span className="text-gray-900">MXN 0,00</span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 flex justify-between font-semibold">
                      <span className="text-gray-900">Total</span>
                      <span className="text-gray-900">
                        {formatCurrency(parseFloat(order.total_amount.toString()))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Créditos al Wallet - Solo se muestra si hay créditos */}
              {(!loadingWalletTransactions && walletTransactions.length > 0) || loadingWalletTransactions ? (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Créditos al Monedero</h2>
                    {order?.client_id && (
                      <Link 
                        href={`/clients/${order.client_id}?tab=wallet`}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        Ver monedero
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )}
                  </div>
                  {loadingWalletTransactions ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                      <span className="ml-2 text-xs text-gray-500">Cargando transacciones...</span>
                    </div>
                  ) : walletTransactions.length > 0 ? (
                    <>
                      <p className="text-xs text-gray-500 mb-4">
                        Se acreditó saldo al monedero electrónico del cliente por productos no surtidos
                      </p>
                      <div className="space-y-3">
                        {walletTransactions.map((transaction) => (
                          <div key={transaction.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  <span className="text-sm font-semibold text-green-600">
                                    +{formatCurrency(transaction.amount)}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                                    Acreditado
                                  </span>
                                </div>
                                {transaction.reason && (
                                  <p className="text-xs text-gray-600 mb-1">{transaction.reason}</p>
                                )}
                                {transaction.description && (
                                  <p className="text-xs text-gray-500 mb-1">{transaction.description}</p>
                                )}
                                <p className="text-xs text-gray-500">
                                  {formatDate(transaction.created_at)}
                                </p>
                              </div>
                              {order?.client_id && (
                                <Link
                                  href={`/clients/${order.client_id}?tab=wallet&transaction=${transaction.id}`}
                                  className="ml-4 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 whitespace-nowrap"
                                  title="Ver detalles de la transacción"
                                >
                                  Ver transacción
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}

            {/* Transacciones */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Transacciones</h2>
                <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Transacción manual</button>
              </div>
              {loadingWalletTransactions ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  <span className="ml-2 text-xs text-gray-500">Cargando transacciones...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Transacciones de pago desde payment_transactions */}
                  {order.payment_transactions && order.payment_transactions.length > 0 ? (
                    <>
                      {order.payment_transactions.map((transaction, index) => {
                        const isWallet = transaction.payment_method === 'wallet';
                        const isKarlopay = transaction.payment_method === 'karlopay' || transaction.payment_method === 'card';
                        
                        return (
                          <div key={`payment-${transaction.id}`} className="border-b border-gray-200 pb-3">
                            <p className="text-xs text-gray-500 mb-3">
                              Transacción #{index + 1} el {formatDate(transaction.created_at)}
                            </p>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    transaction.status === 'completed' 
                                      ? 'bg-green-50 text-green-700' 
                                      : transaction.status === 'pending'
                                      ? 'bg-yellow-50 text-yellow-700'
                                      : 'bg-red-50 text-red-700'
                                  }`}>
                                    {transaction.status === 'completed' ? 'SUCCESS' : 
                                     transaction.status === 'pending' ? 'PENDING' : 'FAILED'}
                                  </span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {formatCurrency(transaction.amount)}
                                  </span>
                                  <span className="text-xs text-gray-500">Capture</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs text-blue-600 font-mono">
                                    {transaction.transaction_id?.slice(0, 8) || transaction.external_reference?.slice(0, 8) || transaction.id.slice(0, 8)}...
                                  </span>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {transaction.completed_at ? formatDate(transaction.completed_at) : formatDate(transaction.created_at)}
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500">
                                {isWallet ? 'wallet' : isKarlopay ? 'KarloPay' : transaction.payment_method}
                                {transaction.last_four && ` • ${transaction.last_four}`}
                                {transaction.card_type && ` • ${transaction.card_type}`}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Indicador de pago múltiple */}
                      {order.payment_transactions.length > 1 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs text-gray-500 italic">
                            💳 Pago múltiple: {order.payment_transactions.map((tx, idx) => 
                              `${tx.payment_method === 'wallet' ? 'wallet' : 'KarloPay'} (${formatCurrency(tx.amount)})`
                            ).join(' + ')}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-500">No hay transacciones registradas</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
          </div>

          {/* Sidebar fijo sin scroll */}
          <div className="w-96 flex-shrink-0 border-l border-gray-200 bg-white">
            <div className="h-full overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Información del cliente */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Cliente</h2>
                  </div>
                  <div className="space-y-4">
                    {order.client_email && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Email</p>
                        <p className="text-sm font-medium text-gray-900">{order.client_email}</p>
                        <a href={`mailto:${order.client_email}`} className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block">
                          Ver perfil
                        </a>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Información de contacto</p>
                      {order.client_email && (
                        <p className="text-sm text-gray-900">{order.client_email}</p>
                      )}
                      {order.client_phone && (
                        <p className="text-sm text-gray-900 mt-1">{order.client_phone}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dirección de envío */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Dirección de envío</h2>
                    <button className="text-xs text-blue-600 hover:text-blue-800">Editar</button>
                  </div>
                  <div className="space-y-2 text-sm text-gray-900">
                    {order.client_first_name && order.client_last_name && (
                      <p className="font-medium">
                        {order.client_first_name} {order.client_last_name}
                      </p>
                    )}
                    {order.client_phone && (
                      <p>{order.client_phone}</p>
                    )}
                    {order.delivery_address_text && (
                      <p className="text-gray-600 leading-relaxed">{order.delivery_address_text}</p>
                    )}
                  </div>
                </div>

                {/* Dirección de facturación */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Dirección de facturación</h2>
                    <button className="text-xs text-blue-600 hover:text-blue-800">Editar</button>
                  </div>
                  <div className="space-y-2 text-sm text-gray-900">
                    {order.client_first_name && order.client_last_name && (
                      <p className="font-medium">
                        {order.client_first_name} {order.client_last_name}
                      </p>
                    )}
                    {order.client_phone && (
                      <p>{order.client_phone}</p>
                    )}
                    {order.delivery_address_text && (
                      <p className="text-gray-600 leading-relaxed">{order.delivery_address_text}</p>
                    )}
                  </div>
                </div>

                {/* Canal de ventas */}
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Canal de ventas</h2>
                  <a href="#" className="text-sm text-blue-600 hover:text-blue-800">
                    {selectedBusiness?.name || 'Tienda Web'}
                  </a>
                </div>

                {/* Facturas */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Facturas</h2>
                    <button className="text-xs text-blue-600 hover:text-blue-800">Crear</button>
                  </div>
                  <p className="text-sm text-gray-500">No hay facturas por mostrar</p>
                </div>

                {/* Notas */}
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Notas</h2>
                  <p className="text-sm text-gray-500">No hay notas del cliente</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LocalLayout>
  );
}

