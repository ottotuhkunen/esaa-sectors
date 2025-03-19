import React, { useState, useEffect } from 'react';
import Map, { Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import sectorsGeoJson from './sectors.geojson';
import tmaGeoJson from './tma.geojson';
import firsJson from './firs.json';
import aerodromesGeoJson from './aerodromes.geojson';

const mapboxToken = 'pk.eyJ1Ijoib3R0b3R1aGt1bmVuIiwiYSI6ImNseG41dW9vaDAwNzQycXNleWI1MmowbHcifQ.1ZMRPeOQ7z9GRzKILnFNAQ';

const App = () => {
  const [onlineControllers, setOnlineControllers] = useState(['ESAA']);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [displayOption, setDisplayOption] = useState('ALL');
  const [showAccLabels, setShowAccLabels] = useState(true);
  const [showAerodromes, setShowAerodromes] = useState(false);
  const [altitude, setAltitude] = useState(340);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    fetch('https://ottotuhkunen.github.io/esaa-sector-map-configuration/config.json')
      .then(response => response.json())
      .then(data => setConfig(data))
      .catch(error => console.error('Error fetching config:', error));
  }, []);

  if (!config) {
    return <div>Loading...</div>;
  }

  const { controllerList, sectorsOwnership, presets, connectGroupWithRealSectors } = config;

  const getSectorOwner = (sectorCode, onlineControllers) => {
    const sectorControllers = sectorsOwnership[sectorCode];
    for (let controller of sectorControllers) {
      if (onlineControllers.includes(controller)) {
        return controller;
      }
    }
    return null;
  };

  const toggleController = (callsign) => {
    setSelectedPreset(null);
    setOnlineControllers(prev =>
      prev.includes(callsign)
        ? prev.filter(c => c !== callsign)
        : [...prev, callsign]
    );
  };

  const applyPreset = (presetControllers, presetName) => {
    setOnlineControllers(presetControllers);
    setSelectedPreset(presetName);
  };

  const getSectorFillColor = (sectorCode) => {
    const owner = getSectorOwner(sectorCode, onlineControllers);
    const controller = controllerList.find(c => c.name === owner);
    return owner ? controller.color : 'rgb(255, 255, 255)'; // default
  };

  const toggleDisplay = () => {
    setDisplayOption(prev =>
      prev === 'UPPER' ? 'LOWER' : prev === 'LOWER' ? 'ALL' : 'UPPER'
    );
  };

  return (
    <div style={{ height: '100vh', backgroundColor: '#1e1e1e', color: '#ffffff' }}>
      {/* Controller buttons */}
      <div style={{
        padding: '4px',
        display: 'flex',
        flexWrap: 'wrap',
        background: '#646464',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {controllerList.map((controller) => (
          <button
            key={controller.name}
            style={{
              margin: '4px',
              padding: '8px',
              background: onlineControllers.includes(controller.name) ? controller.color : '#2b2d31',
              color: onlineControllers.includes(controller.name) ? 'black' : '#9e9e9e',
              fontWeight: onlineControllers.includes(controller.name) ? 'bold' : 'normal',
              border: 'none',
              cursor: 'pointer',
              width: '80px',
              fontSize: '9pt'
            }}
            onClick={() => toggleController(controller.name)}
          >
            {controller.name}
          </button>
        ))}
      </div>

      {/* Map and sectors */}
      <Map
        initialViewState={{
          longitude: 18,
          latitude: 62,
          zoom: 3.8
        }}
        style={{ width: '100%', height: '90%', zIndex: '0' }}
        mapStyle="mapbox://styles/ottotuhkunen/cm8g2jfyj00yv01sa0tvx4vof"
        mapboxAccessToken={mapboxToken}
      >
        {/* TMA geojson */}
        <Source type="geojson" data={tmaGeoJson}>
          <Layer
            id="tma-lines"
            type="line"
            paint={{
              'line-color': '#00bfff',
              'line-width': 0.8,
              'line-dasharray': [2, 2],
              'line-opacity': 0.5
            }}
          />
          <Layer
            id="tma-labels"
            type="symbol"
            layout={{
              'text-field': ['get', 'NAMEOFAREA'],
              'text-font': ['Open Sans Regular'],
              'text-size': 10,
            }}
            paint={{
              'text-color': '#1a475f',
              'text-halo-color': 'black',
              'text-halo-width': 0.1
            }}
            minzoom={6}
          />
        </Source>

        {/* FIRs geojson */}
        <Source type="geojson" data={firsJson}>
          <Layer
            id="firs-lines"
            type="line"
            paint={{
              'line-color': '#006400',
              'line-width': 1.5
            }}
          />
        </Source>

        <Source type="geojson" data={sectorsGeoJson}>
          <Layer
            id="sectors-fill"
            type="fill"
            filter={[
              'all',
              displayOption === 'ALL'
                ? ['in', ['get', 'VERTICALFILTER'], ['literal', ['UPPER', 'LOWER']]]
                : ['==', ['get', 'VERTICALFILTER'], displayOption],
              ['>=', altitude, ['get', 'LOWER']],
              ['<=', altitude, ['get', 'UPPER']]
            ]}
            paint={{
              'fill-color': [
                'match',
                ['get', 'NAMEOFAREA'],
                ...Object.entries(connectGroupWithRealSectors).flatMap(([key, values]) =>
                  values.flatMap(value => [value, getSectorFillColor(key)])
                ),
                'rgb(255, 255, 255)' // Default color
              ],
              'fill-opacity': 0.3
            }}
          />
          <Layer
            id="sectors-border"
            type="line"
            filter={[
              'all',
              displayOption === 'ALL'
                ? ['in', ['get', 'VERTICALFILTER'], ['literal', ['UPPER', 'LOWER']]]
                : ['==', ['get', 'VERTICALFILTER'], displayOption],
              ['>=', altitude, ['get', 'LOWER']],
              ['<=', altitude, ['get', 'UPPER']]
            ]}
            paint={{
              'line-color': 'gray',
              'line-width': 1
            }}
          />
          {showAccLabels && (
            <Layer
              id="acc-labels"
              type="symbol"
              filter={[
                'all',
                displayOption === 'ALL'
                  ? ['in', ['get', 'VERTICALFILTER'], ['literal', ['UPPER', 'LOWER']]]
                  : ['==', ['get', 'VERTICALFILTER'], displayOption],
                ['>=', altitude, ['get', 'LOWER']],
                ['<=', altitude, ['get', 'UPPER']]
              ]}
              layout={{
                'text-field': ['concat', ['get', 'NAMEOFAREA'], '\n', ['get', 'LOWER'], ' - ', ['get', 'UPPER']],
                'text-font': ['Open Sans Bold'],
                'text-size': 10,
              }}
              paint={{
                'text-color': 'black',
                'text-halo-color': 'white',
                'text-halo-width': 0.6
              }}
              minzoom={4}
            />
          )}
        </Source>

        {/* Aerodromes layer */}
        {showAerodromes && (
          <Source type="geojson" data={aerodromesGeoJson}>
            <Layer
              id="aerodromes"
              type="symbol"
              layout={{
                'text-field': ['concat', '+ ', ['get', 'icao']],
                'text-font': ['Open Sans Regular'],
                'text-size': 9,
                'text-anchor': 'left',
                'text-offset': [0, 0] 
              }}
              paint={{
                'text-color': '#666666',
                'text-halo-color': 'white',
                'text-halo-width': 0
              }}
            />
          </Source>
        )}

        {/* Toggle button for Upper/Lower/All sectors */}
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '0',
          zIndex: 1,
          userSelect: 'none',
          backgroundColor: '#dddddd',
          padding: '10px',
          width: '136px'
          }}>
          <label style={{ color: 'black', fontSize: '9pt'}}>
            <input
              type="checkbox"
              checked={showAccLabels}
              onChange={() => setShowAccLabels(!showAccLabels)}
              style={{ marginRight: '5px' }}
            />
            Show Sector Names
          </label>
          <br />
          <label style={{ color: 'black', fontSize: '9pt'}}>
            <input
              type="checkbox"
              checked={showAerodromes}
              onChange={() => setShowAerodromes(!showAerodromes)}
              style={{ marginRight: '5px' }}
            />
            Show Aerodromes
          </label>
        </div>

        {/* Altitude slider */}
        <div style={{
          position: 'absolute',
          top: '80px',
          right: '0',
          zIndex: 1,
          userSelect: 'none',
          backgroundColor: '#dddddd',
          padding: '10px',
          width: '136px'
        }}>
          <p style={{ color: 'black', textAlign: 'center', marginTop: '0'}}>
            Filter Sectors by FL</p>
          <input
            type="range"
            min="0"
            max="660"
            step="10"
            value={altitude}
            onChange={(e) => setAltitude(Number(e.target.value))}
            style={{ width: '138px', margin: '0px'}}
          />
          <div style={{ textAlign: 'center', color: 'black' }}>
            FL {altitude}
          </div>
        </div>

      </Map>

      {/* Preset buttons */}
      <div style={{
        padding: '4px',
        display: 'flex',
        flexWrap: 'wrap',
        background: '#646464',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'fixed',
        width: '100%',
        bottom: '0'
      }}>
        {presets.map((preset, index) => (
          <button
            key={index}
            style={{
              margin: '4px',
              padding: '8px',
              background: selectedPreset === preset.name ? '#dddddd' : '#2b2d31',
              color: selectedPreset === preset.name ? 'black' : '#9e9e9e',
              fontWeight: selectedPreset === preset.name ? 'bold' : 'normal',
              border: 'none',
              cursor: 'pointer',
              width: '100px',
              fontSize: '9pt'
            }}
            onClick={() => applyPreset(preset.controllers, preset.name)}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default App;