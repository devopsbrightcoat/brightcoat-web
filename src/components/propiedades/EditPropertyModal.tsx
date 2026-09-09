import { useEffect, useState } from 'react'
import { Modal } from '../common/Modal'
import { updateProperty } from '../../lib/api'
import type { ClientType, Property, PropertyStatus } from '../../types'
import { getErrorMessage } from '../../lib/errors'

const CLIENT_TYPE_OPTIONS: { value: ClientType; label: string }[] = [
  { value: 'residential', label: 'Residencial' },
  { value: 'multifamily', label: 'Multifamiliar' },
  { value: 'property_manager', label: 'Property manager' },
]

const STATUS_OPTIONS: { value: PropertyStatus; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
]

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

type EditPropertyModalProps = {
  property: Property | null
  onClose: () => void
  onSaved: () => void
}

export const EditPropertyModal = ({ property, onClose, onSaved }: EditPropertyModalProps) => {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [clientType, setClientType] = useState<ClientType>('residential')
  const [managerContact, setManagerContact] = useState('')
  const [status, setStatus] = useState<PropertyStatus>('active')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!property) return
    setName(property.name)
    setAddress(property.address ?? '')
    setClientType(property.clientType)
    setManagerContact(property.managerContact ?? '')
    setStatus(property.status)
    setError(null)
  }, [property])

  const handleSave = async () => {
    if (!property) return
    if (!name.trim()) {
      setError('El nombre de la propiedad es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateProperty(property.id, { name: name.trim(), address, clientType, managerContact, status })
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar la propiedad.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={property !== null} onClose={onClose} title="Editar propiedad">
      <div className="space-y-4">
        <div>
          <label htmlFor="prop-name" className={labelClass}>
            Nombre
          </label>
          <input id="prop-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label htmlFor="prop-address" className={labelClass}>
            Dirección
          </label>
          <input
            id="prop-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="prop-client-type" className={labelClass}>
            Tipo de cliente
          </label>
          <select
            id="prop-client-type"
            value={clientType}
            onChange={(e) => setClientType(e.target.value as ClientType)}
            className={inputClass}
          >
            {CLIENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="prop-contact" className={labelClass}>
            Contacto del manager
          </label>
          <input
            id="prop-contact"
            type="text"
            value={managerContact}
            onChange={(e) => setManagerContact(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="prop-status" className={labelClass}>
            Estado
          </label>
          <select
            id="prop-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PropertyStatus)}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-ink-300 hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400 disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
