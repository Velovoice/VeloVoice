import React from 'react';
import { Phone, Users, History, Star, Grid } from 'lucide-react';

export default function PhoneView() {
    const recents = [
        { name: 'Home', time: '10:45 AM', type: 'mobile' },
        { name: 'Work', time: '9:15 AM', type: 'office' },
        { name: 'Mom', time: 'Yesterday', type: 'mobile' },
    ];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ borderBottom: '1px solid #2C2C2E', paddingBottom: '16px' }}>
                <h2 style={{ fontSize: '28px', margin: 0, fontWeight: '700' }}>Phone</h2>
            </div>

            <div className="phone-grid">
                {/* Left Sidebar for Phone App */}
                <div className="phone-sidebar">
                    {[
                        { icon: Star, label: 'Favorites' },
                        { icon: History, label: 'Recents', active: true },
                        { icon: Users, label: 'Contacts' },
                        { icon: Grid, label: 'Keypad' }
                    ].map((item, i) => (
                        <button
                            key={item.label}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                background: item.active ? '#2C2C2E' : 'transparent',
                                border: 'none',
                                borderRadius: '12px',
                                color: item.active ? '#34C759' : '#fff',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '16px',
                                fontWeight: item.active ? '600' : '400',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Main Content: Recents List */}
                <div className="phone-main">
                    {recents.map((contact, i) => (
                        <div
                            key={i}
                            style={{
                                padding: '16px 24px',
                                borderBottom: i < recents.length - 1 ? '1px solid #2C2C2E' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '18px', fontWeight: '600' }}>{contact.name}</div>
                                <div style={{ fontSize: '14px', color: '#8E8E93' }}>{contact.type}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                                <span style={{ color: '#8E8E93' }}>{contact.time}</span>
                                <Phone size={20} color="#34C759" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
