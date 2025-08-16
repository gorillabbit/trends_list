import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import PackagePresets from './components/PackagePresets';

function App() {
	return (
		<div className="min-h-screen bg-gray-100">
			<Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/packages/:packageName" element={<PackagePresets />} />
				</Routes>
			</Router>
		</div>
	);
}

export default App;
