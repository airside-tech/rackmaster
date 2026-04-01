# Rackmaster

A web-based data rack planning and management tool for IT professionals. Rackmaster helps you organize, visualize, and manage your equipment rooms and server racks efficiently.

## Features

- **Equipment Room Management**: Create and organize equipment rooms by building and floor level
- **Rack Configuration**: Define racks with custom heights (RU), depths, power consumption specifications, and tags
- **Visual Planning**: Drag-and-drop interface to arrange equipment within racks
- **Catalog Management**: Export and import your equipment catalogs as JSON or CSV for backup and sharing
- **Local Storage**: All data is stored locally in your browser for quick access and offline capability
- **Flexible Organization**: Track rack positions using tile coordinates (X, Y) for accurate facility mapping

## Getting Started

### Quick Start

1. **Open the application**: Open `index.html` in your web browser
2. **Create an Equipment Room**:
   - Enter room name, building, floor level, and optional notes
   - Click "Create Room"
3. **Add Racks**:
   - Select the room from the dropdown
   - Enter rack name, tag (e.g., RACK-01), height in RU, and other specifications
   - Specify the rack's position using tile coordinates
   - Click "Create Rack"
4. **Plan Your Layout**:
   - Open the planner to visually arrange equipment within your racks
   - Click "Open Empty Planner" or access racks from the room sections

### Managing Your Catalog

- **Export**: Save your catalog, rack files, and library files as JSON or CSV. When exporting, choose format and destination in the browser save dialog (when supported).
- **Import**: Load previously exported JSON or CSV files for catalog, rack, and library data

## File Structure

- `index.html` - Main application interface for room and rack management
- `planner.html` - Visual rack planning interface
- `script.js` - Application logic and local storage management
- `styles.css` - Application styling

## Technical Details

- **Storage**: Data is persisted using browser localStorage
- **Browser Compatibility**: Modern browsers with localStorage support
- **No Backend Required**: Runs entirely in the browser

## How to Use

### Basic Workflow

1. Start by creating equipment rooms that represent different locations in your facility
2. Add racks to each room, specifying their physical characteristics
3. Use the planner interface to organize equipment within racks
4. Export your catalog regularly for backup purposes

### Tips

- Use consistent naming conventions for racks (e.g., RACK-01, RACK-02) for easy reference
- Include building and floor information in room creation for better organization
- Add notes to rooms and racks to track special considerations or equipment types
- Use tile coordinates to accurately map rack positions in your facility layout

## License

See LICENSE file for details.

## Support

For issues or feature requests, please contact the development team at airside-tech.
