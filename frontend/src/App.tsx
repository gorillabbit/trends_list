import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import PackagePresets from './components/PackagePresets';
import TagList from './components/TagList';
import TagDetail from './components/TagDetail';
import { Box } from '@mui/material';

function App() {
	return (
		<Box>
			<Router
				future={{
					v7_startTransition: true,
					v7_relativeSplatPath: true,
				}}
			>
				<Routes>
					<Route path="/" element={<Home />} />
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
