import React, { useState } from 'react';
import { Package, Users, ClipboardCheck, Save, AlertCircle } from 'lucide-react';

const BuvetteApp = () => {
  const [activeTab, setActiveTab] = useState('inventaire');
  const [matchInfo] = useState({
    adversaire: "Lausanne HC",
    date: "21 Nov 2025",
    buvette: "Tribune Nord - B2"
  });

  // Données simulées (State)
  const [inventory, setInventory] = useState([
    { id: 1, name: 'Bière Blonde (Fût 20L)', start: 5, add: 2, end: 0 },
    { id: 2, name: 'Coca-Cola (Pet 50cl)', start: 48, add: 0, end: 0 },
    { id: 3, name: 'Hot-Dog Pain', start: 100, add: 50, end: 0 },
  ]);

  const [staff, setStaff] = useState([
    { id: 1, name: 'Jean Dupont', start: '17:00', end: '23:00', break: 30 },
    { id: 2, name: 'Sophie Martin', start: '17:30', end: '23:00', break: 15 },
  ]);

  const [checklist, setChecklist] = useState({
    temp: true,
    clean: false,
    cash: false
  });

  const calculateSales = (item) => {
    return item.start + item.add - item.end;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      {/* En-tête */}
      <div className="bg-blue-900 text-white p-4 rounded-lg shadow-lg mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">{matchInfo.buvette}</h1>
          <p className="text-sm text-blue-200">Match vs {matchInfo.adversaire} • {matchInfo.date}</p>
        </div>
        <div className="bg-blue-700 px-3 py-1 rounded text-xs font-mono">
          Status: OUVERT
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-2 mb-6 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('inventaire')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${activeTab === 'inventaire' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
        >
          <Package size={18} /> <span>Inventaire</span>
        </button>
        <button 
          onClick={() => setActiveTab('staff')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${activeTab === 'staff' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
        >
          <Users size={18} /> <span>Staff / RH</span>
        </button>
        <button 
          onClick={() => setActiveTab('control')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${activeTab === 'control' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
        >
          <ClipboardCheck size={18} /> <span>Autocontrôle</span>
        </button>
      </div>

      {/* CONTENU: INVENTAIRE */}
      {activeTab === 'inventaire' && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold mb-4 text-gray-800">Saisie des Stocks</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-sm text-gray-500 border-b">
                  <th className="py-2">Produit</th>
                  <th className="py-2 text-center">Initial</th>
                  <th className="py-2 text-center text-blue-600">Réassort (+)</th>
                  <th className="py-2 text-center text-red-600">Final (-)</th>
                  <th className="py-2 text-right">Vendus</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item, idx) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{item.name}</td>
                    <td className="text-center">{item.start}</td>
                    <td className="text-center">
                      <input type="number" className="w-16 border rounded p-1 text-center bg-blue-50" defaultValue={item.add} />
                    </td>
                    <td className="text-center">
                      <input type="number" className="w-16 border rounded p-1 text-center bg-red-50 border-red-200" placeholder="0" />
                    </td>
                    <td className="text-right font-bold text-gray-700">
                      {calculateSales(item)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded flex items-start">
            <AlertCircle className="text-yellow-600 mr-2 mt-1" size={18} />
            <p className="text-sm text-yellow-800">
              Note : N'oubliez pas de compter les produits endommagés dans la section "Pertes" avant de valider.
            </p>
          </div>
        </div>
      )}

      {/* CONTENU: STAFF */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold mb-4 text-gray-800">Feuille d'heures (Hotelis/Interne)</h2>
          {staff.map(employee => (
            <div key={employee.id} className="border rounded-lg p-3 mb-3 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-gray-700">{employee.name}</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Extra</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <label className="block text-gray-500 text-xs">Début</label>
                  <input type="time" defaultValue={employee.start} className="w-full border rounded p-1" />
                </div>
                <div>
                  <label className="block text-gray-500 text-xs">Fin</label>
                  <input type="time" defaultValue={employee.end} className="w-full border rounded p-1" />
                </div>
                <div>
                  <label className="block text-gray-500 text-xs">Pause (min)</label>
                  <input type="number" defaultValue={employee.break} className="w-full border rounded p-1" />
                </div>
              </div>
            </div>
          ))}
          <button className="w-full py-2 mt-2 border-2 border-dashed border-gray-300 text-gray-500 rounded hover:bg-gray-50">
            + Ajouter un employé
          </button>
        </div>
      )}

      {/* CONTENU: CHECKLIST */}
      {activeTab === 'control' && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold mb-4 text-gray-800">Fiche d'autocontrôle</h2>
          <div className="space-y-4">
            <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
              <input type="checkbox" className="h-5 w-5 text-blue-600" defaultChecked={checklist.temp} />
              <span className="ml-3 text-gray-700">Relevé température frigos OK (< 5°C)</span>
            </label>
            <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
              <input type="checkbox" className="h-5 w-5 text-blue-600" defaultChecked={checklist.clean} />
              <span className="ml-3 text-gray-700">Plan de travail nettoyé et désinfecté</span>
            </label>
            <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
              <input type="checkbox" className="h-5 w-5 text-blue-600" defaultChecked={checklist.cash} />
              <span className="ml-3 text-gray-700">Fond de caisse compté et validé</span>
            </label>
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-bold text-gray-700 mb-1">Commentaire / Incident</label>
            <textarea className="w-full border rounded p-2 h-24" placeholder="Ex: Panne tireuse à bière à 20h..."></textarea>
          </div>
        </div>
      )}

      {/* Bouton d'action global */}
      <div className="fixed bottom-4 left-4 right-4">
        <button className="w-full bg-green-600 text-white font-bold py-3 rounded-lg shadow-lg flex justify-center items-center space-x-2 hover:bg-green-700">
          <Save size={20} />
          <span>Sauvegarder les données</span>
        </button>
      </div>
    </div>
  );
};

export default BuvetteApp;