import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);  // Estado para el usuario autenticado

    const login = (email) => {
        setUser({ email }); // Guardar la información del usuario en el contexto
    };

    const logout = () => {
        setUser(null);  // Eliminar la información del usuario
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);  // Custom hook para acceder al contexto
