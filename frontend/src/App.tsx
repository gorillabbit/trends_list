import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Home from './components/Home';
import PackagePresets from './components/PackagePresets';
import PackageList from './components/PackageList';
import TagList from './components/TagList';
import TagDetail from './components/TagDetail';
import Header from './components/Header';
import CreatePresetForm from './components/CreatePresetForm';
import { Box, Container } from '@mui/material';
import { useAuth } from '@clerk/clerk-react';

function App() {
	const [showCreateForm, setShowCreateForm] = useState(false);
	const { isSignedIn } = useAuth();

	const handlePresetCreated = () => {
		setShowCreateForm(false);
		window.location.reload();
	};

	return (
		<Box>
			<Router
				future={{
					v7_startTransition: true,
					v7_relativeSplatPath: true,
				}}
			>
				<Header onCreateClick={() => setShowCreateForm(true)} />

				{isSignedIn && showCreateForm && (
					<Container sx={{ py: 4 }}>
						<CreatePresetForm
							onPresetCreated={handlePresetCreated}
							onCancel={() => setShowCreateForm(false)}
						/>
					</Container>
				)}

				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/packages" element={<PackageList />} />
					<Route
						path="/packages/:packageName"
						element={<PackagePresets />}
					/>
					<Route path="/tags" element={<TagList />} />
					<Route path="/tags/:tagId" element={<TagDetail />} />
				</Routes>
			</Router>
		</Box>
	);
}

export default App;
