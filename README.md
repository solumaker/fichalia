# Control de Fichajes - Time Tracking Application

Sistema completo de control de fichajes laborales con geolocalización, diseñado como PWA para uso móvil.

## 🚀 Características

### Empleados
- ✅ Interface minimalista con botones grandes para fichar entrada/salida
- 📍 Captura automática de geolocalización obligatoria
- ⚡ Confirmación visual inmediata de fichajes
- 📱 Optimizado para móviles (PWA)
- 🔒 Acceso seguro con autenticación

### Administradores
- 👥 Gestión completa de usuarios
- 📊 Dashboard con estadísticas en tiempo real
- 📋 Historial detallado de fichajes con filtros
- 📊 Exportación a CSV por rangos de fechas
- 🗺️ Visualización de ubicaciones de fichajes
- 📈 Reportes y estadísticas

## 🛠️ Tecnologías

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Storage**: LocalStorage (sin backend)
- **PWA**: Vite PWA Plugin
- **Geolocalización**: Web Geolocation API
- **Iconos**: Lucide React
- **Fechas**: date-fns

## 📋 Requisitos Previos

1. Node.js 16+ y npm
2. Navegador con soporte para geolocalización

## 🔧 Configuración

### Instalar y Ejecutar

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Construir para producción
npm run build
```

## 👤 Usuarios de Prueba

Para probar la aplicación, debes crear usuarios en Supabase con los siguientes roles:

**Administrador:**
- Email: admin@empresa.com
- Contraseña: (la que definas)
- Rol: admin

**Empleado:**
- Email: empleado@empresa.com
- Contraseña: (la que definas)
- Rol: employee

## 🏗️ Estructura del Proyecto

```
src/
├── components/
│   ├── AdminDashboard.tsx    # Panel administrativo
│   ├── EmployeeDashboard.tsx # Interface para empleados
│   └── AuthForm.tsx          # Formulario de login/registro
├── hooks/
│   ├── useAuth.ts            # Hook de autenticación
│   └── useGeolocation.ts     # Hook de geolocalización
├── lib/
│   └── localStorage.ts       # Gestión de datos locales
└── App.tsx                   # Componente principal
```

## 📱 PWA - Instalación en Móvil

1. Abre la aplicación en el navegador móvil
2. Aparecerá una notificación para "Añadir a pantalla de inicio"
3. Una vez instalada, la app funciona como aplicación nativa

## 🔒 Seguridad

- ✅ Datos almacenados localmente en el navegador
- ✅ Empleados solo ven sus propios datos
- ✅ Administradores tienen acceso completo
- ✅ Geolocalización obligatoria para fichajes
- ✅ Prevención de fichajes duplicados

## 💾 Almacenamiento de Datos

### Supabase Database
La aplicación utiliza Supabase como base de datos principal con las siguientes tablas:
- `profiles` - Perfiles de usuarios con roles y información personal
- `time_entries` - Registros de fichajes con geolocalización

### Estructura de Usuario
```typescript
{
  id: string
  email: string
  full_name: string
  role: 'employee' | 'admin'
  active: boolean
  created_at: string
}
```

### Estructura de Fichaje
```typescript
{
  id: string
  user_id: string
  entry_type: 'check_in' | 'check_out'
  timestamp: string
  latitude?: number
  longitude?: number
  address?: string
  created_at: string
}
```

## 🚀 Despliegue

### Netlify/Vercel
1. Conecta tu repositorio
2. Deploy automático (no requiere variables de entorno)

### Bolt Hosting
```bash
npm run build
# Upload dist/ folder
```

## 📝 Uso

### Para Empleados:
1. Login con credenciales
2. Permite el acceso a la ubicación
3. Pulsa "FICHAR ENTRADA" o "FICHAR SALIDA"
4. Confirmación automática del fichaje

### Para Administradores:
1. Login con cuenta admin
2. Gestiona usuarios en el panel
3. Visualiza fichajes en tiempo real
4. Exporta reportes por fechas
5. Activa/desactiva empleados

## 🤝 Contribución

1. Fork del proyecto
2. Crea una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más información.

## 🆘 Soporte

Si tienes problemas:
1. Verifica que los permisos de geolocalización estén activados
2. Comprueba la consola del navegador para errores
3. Los datos se almacenan localmente - no se perderán al cerrar el navegador

---

**¡Listo para gestionar fichajes de manera profesional! 🎉**