import { NavLink } from 'react-router-dom';
import {
  CurrencyDollarIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  KeyIcon,
  ClockIcon,
  Cog6ToothIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const navigation = [
  { name: 'Cost Management', href: '/costs', icon: CurrencyDollarIcon },
  { name: 'RBAC Manager', href: '/rbac', icon: ShieldCheckIcon },
  { name: 'Groups Manager', href: '/groups', icon: UserGroupIcon },
  { name: 'Service Principals', href: '/service-principals', icon: KeyIcon },
  { name: 'Key Vault', href: '/keyvault', icon: LockClosedIcon },
  { name: 'Secret Monitor', href: '/secrets', icon: ClockIcon },
];

export function Sidebar() {
  return (
    <aside className="flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-azure-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">Az</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            Azure Manager
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              clsx('nav-item', isActive && 'nav-item-active')
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Settings */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx('nav-item', isActive && 'nav-item-active')
          }
        >
          <Cog6ToothIcon className="w-5 h-5" />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
