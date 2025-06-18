import React from 'react';
import { Breadcrumb } from 'react-bootstrap';
import { useAppState, useVisualizationState, useDataState } from '../../core/AppStateManager';
import './BreadcrumbNav.css';

const BreadcrumbNav = ({ 
  loadSupernodeData,
  breadcrumbPath: propBreadcrumbPath = null,
  onNavigate = null
}) => {
  const { actions } = useAppState();
  const { breadcrumbPath: stateBreadcrumbPath } = useVisualizationState();
  const { dataset, algorithm } = useDataState();
  
  // Use prop breadcrumbPath if provided, otherwise use from state
  const breadcrumbPath = propBreadcrumbPath || stateBreadcrumbPath;

  const navigateViaBreadcrumb = (index) => {
    if (index >= 0 && index < breadcrumbPath.length) {
      // Get the supernode at the specified index
      const targetSupernode = breadcrumbPath[index].id;
      
      // If external onNavigate handler provided, use it
      if (onNavigate) {
        onNavigate(index);
        return;
      }
      
      // Otherwise, use internal state management
      // Update the breadcrumb path (truncate to the selected index)
      const newPath = breadcrumbPath.slice(0, index + 1);
      actions.setBreadcrumbPath(newPath);
      
      // Navigate to the selected supernode
      actions.setCurrentSupernode(targetSupernode);
      
      // Load the supernode data using the passed function
      if (dataset && targetSupernode && loadSupernodeData) {
        loadSupernodeData(targetSupernode);
      }
    }
  };

  // Don't render if no breadcrumb path
  if (!breadcrumbPath || breadcrumbPath.length === 0) {
    return null;
  }

  return (
    <div className="breadcrumb-navigation">
      <Breadcrumb>
        <Breadcrumb.Item className="text-muted">
          <small>Navigation Path:</small>
        </Breadcrumb.Item>
        {breadcrumbPath.map((item, index) => (
          <Breadcrumb.Item 
            key={`${item.id}-${index}`}
            active={index === breadcrumbPath.length - 1}
            onClick={() => navigateViaBreadcrumb(index)}
            className={index === breadcrumbPath.length - 1 ? "active-crumb" : "clickable-crumb"}
            title={`Navigate to ${item.label} (Level ${breadcrumbPath.length - index})`}
          >
            {item.label}
            {index === breadcrumbPath.length - 1 && (
              <small className="text-muted ms-1">(current)</small>
            )}
          </Breadcrumb.Item>
        ))}
      </Breadcrumb>
      
      {/* Additional Navigation Info */}
      <div className="breadcrumb-info">
        <small className="text-muted">
          Level {breadcrumbPath.length} of hierarchy • 
          Current: {breadcrumbPath[breadcrumbPath.length - 1]?.label} • 
          Algorithm: {algorithm}
        </small>
      </div>
    </div>
  );
};

export default BreadcrumbNav;