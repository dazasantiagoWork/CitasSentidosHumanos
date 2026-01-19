import { useState } from 'react';
import Calendar from 'react-calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-calendar/dist/Calendar.css';
import './BookingForm.css';

const WEBHOOK_URL = 'https://n8n-production-6d0f.up.railway.app/webhook-test/agendamiento-landing-sh';

const BookingService = {
    async fetchSlots(date, service) {
        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'get_slots',
                    date: format(date, 'yyyy-MM-dd'),
                    service: service
                })
            });

            if (!response.ok) throw new Error('Error en el servidor');

            const data = await response.json();
            const rawSlots = Array.isArray(data) ? data : (data.slots || []);
            return rawSlots.filter(slot => slot.time);
        } catch (error) {
            console.error('Error fetchSlots:', error);
            throw error;
        }
    },

    async submitBooking(bookingData) {
        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_booking',
                    ...bookingData
                })
            });

            if (!response.ok) throw new Error('Error en la reserva');
            return true;
        } catch (error) {
            console.error('Error submitBooking:', error);
            throw error;
        }
    }
};

export default function BookingForm() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        service: ''
    });

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasSearched, setHasSearched] = useState(false);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleInfoSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.phone || !formData.email || !formData.service) { // Updated validation
            setError('Por favor completa todos los campos.');
            return;
        }
        setError('');
        setStep(2);
        setAvailableSlots([]);
        setSelectedSlot(null);
    };

    const handleDateSelect = async (date) => {
        setSelectedDate(date);
        setSelectedSlot(null);
        setAvailableSlots([]);
        setLoading(true);
        setError('');
        setHasSearched(true);

        try {
            const slots = await BookingService.fetchSlots(date, formData.service); // Updated to pass service
            setAvailableSlots(slots);
        } catch (err) {
            console.error(err);
            setError('Error al obtener horarios.');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalConfirm = async () => {
        if (!selectedSlot) return;
        setLoading(true);

        try {
            const bookingPayload = {
                ...formData,
                date: format(selectedDate, 'yyyy-MM-dd'),
                time: selectedSlot.time
            };

            await BookingService.submitBooking(bookingPayload);
            setStep(3);
        } catch (err) {
            setError('Error al agendar. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setStep(1);
        setFormData({
            name: '',
            phone: '',
            email: '',
            service: ''
        });
        setSelectedSlot(null);
        setAvailableSlots([]);
        setHasSearched(false);
    };

    return (
        <div className="booking-card">
            <div className="card-header">
                <img
                    src="/logoCompletoSentidosHumanos.jpeg"
                    alt="Logo Sentidos Humanos"
                    className="app-logo"
                />
                <h2>Agendamiento de Citas</h2>
                <p>Sentidos Humanos</p>
            </div>

            <div className="card-body">
                {step === 1 && (
                    <StepInfo
                        formData={formData}
                        onChange={handleFormChange}
                        onSubmit={handleInfoSubmit}
                        error={error}
                    />
                )}

                {step === 2 && (
                    <StepCalendar
                        date={selectedDate}
                        onDateChange={handleDateSelect}
                        slots={availableSlots}
                        selectedSlot={selectedSlot}
                        onSlotSelect={setSelectedSlot}
                        onConfirm={handleFinalConfirm}
                        onBack={() => setStep(1)}
                        loading={loading}
                        error={error}
                        hasSearched={hasSearched}
                    />
                )}

                {step === 3 && (
                    <StepSuccess
                        date={selectedDate}
                        slot={selectedSlot}
                        phone={formData.phone}
                    />
                )}
            </div>
        </div>
    );
}

function StepInfo({ formData, onChange, onSubmit, error }) {
    return (
        <form onSubmit={onSubmit} className="booking-form fade-in">
            <div className="form-group">
                <label>Nombre Completo</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={onChange}
                    placeholder="Ej. Juan Pérez"
                    required
                />
            </div>

            <div className="form-group">
                <label>Teléfono</label>
                <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={onChange}
                    placeholder="Ej. 300 123 4567"
                    required
                />
            </div>

            <div className="form-group">
                <label>Correo Electrónico</label>
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={onChange}
                    placeholder="Ej. juan@correo.com"
                    required
                />
            </div>

            <div className="form-group">
                <label>Servicio</label>
                <select
                    name="service"
                    value={formData.service}
                    onChange={onChange}
                    required
                >
                    <option value="">Seleccione un servicio...</option>
                    <option value="Psicología">Psicología</option>
                    <option value="Medicina General">Medicina General</option>
                    <option value="Medicina Alternativa">Medicina Alternativa</option>
                    <option value="Terapia Física">Terapia Física</option>
                </select>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button type="submit" className="btn-primary">
                Continuar al Calendario
            </button>
        </form>
    );
}

function StepCalendar({ date, onDateChange, slots, selectedSlot, onSlotSelect, onConfirm, onBack, loading, error, hasSearched }) {
    return (
        <div className="calendar-view fade-in">
            <div className="view-header">
                <button className="btn-back" onClick={onBack}>← Atrás</button>
                <h3>Selecciona Día y Hora</h3>
            </div>

            <div className="calendar-container">
                <Calendar
                    onChange={onDateChange}
                    value={date}
                    minDate={new Date()}
                    locale="es-ES"
                    prev2Label={null}
                    next2Label={null}
                />
            </div>

            <div className="slots-section">
                <h4>Horarios Disponibles para el {format(date, 'd MMMM', { locale: es })}</h4>

                {loading ? (
                    <div className="loading-spinner">Buscando horarios...</div>
                ) : error ? (
                    null
                ) : slots.length > 0 ? (
                    <div className="slots-grid">
                        {slots.map(slot => (
                            <button
                                key={slot.id}
                                className={`slot-btn ${selectedSlot?.id === slot.id ? 'active' : ''}`}
                                onClick={() => onSlotSelect(slot)}
                            >
                                {slot.time}
                            </button>
                        ))}
                    </div>
                ) : (hasSearched) ? (
                    <p className="no-slots">No hay horarios disponibles para este día.</p>
                ) : (
                    <p className="instruction-text">Selecciona un día en el calendario para ver horarios.</p>
                )}
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div className="actions">
                <button
                    className="btn-primary"
                    onClick={onConfirm}
                    disabled={!selectedSlot || loading}
                >
                    {loading ? 'Agendando...' : 'Confirmar Cita'}
                </button>
            </div>
        </div>
    );
}

function StepSuccess({ date, slot, phone }) {
    return (
        <div className="success-view fade-in">
            <div className="check-icon">✓</div>
            <h3>¡Cita Agendada!</h3>
            <p className="success-details">
                <strong>{format(date, 'PPPP', { locale: es })}</strong><br />
                a las {slot?.time}
            </p>
        </div>
    );
}
