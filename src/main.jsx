import React from 'react';
import {createRoot} from 'react-dom/client';
import Game from './view/Game.jsx';
import './view/game.css';

document.documentElement.dataset.beeHopBuild=__BEEHOP_BUILD_ID__;
createRoot(document.getElementById('root')).render(<React.StrictMode><Game/></React.StrictMode>);
