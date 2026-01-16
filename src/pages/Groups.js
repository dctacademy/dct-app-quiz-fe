import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupAPI, authAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

function Groups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [groups, setGroups] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user && user.role !== 'admin') {
      showToast('Access denied. Admin only.', 'error');
      navigate('/user');
    }
  }, [user, navigate, showToast]);

  useEffect(() => {
    fetchGroups();
    fetchAllStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await groupAPI.getMyGroups();
      setGroups(response.data.groups);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch groups', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStudents = async () => {
    try {
      const response = await authAPI.getAllStudents();
      setAllStudents(response.data.students || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      await groupAPI.createGroup(formData);
      showToast('Group created successfully', 'success');
      setFormData({ name: '', description: '' });
      setShowCreateModal(false);
      fetchGroups();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to create group', 'error');
    }
  };

  const handleAddStudents = async () => {
    if (selectedStudents.length === 0) {
      showToast('Please select at least one student', 'error');
      return;
    }

    try {
      await groupAPI.addStudents(selectedGroup._id, selectedStudents);
      showToast('Students added successfully', 'success');
      setSelectedStudents([]);
      setShowAddStudentsModal(false);
      fetchGroups();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to add students', 'error');
    }
  };

  const handleRemoveStudent = async (groupId, studentId) => {
    if (!window.confirm('Remove this student from the group?')) return;

    try {
      await groupAPI.removeStudent(groupId, studentId);
      showToast('Student removed successfully', 'success');
      fetchGroups();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to remove student', 'error');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;

    try {
      await groupAPI.deleteGroup(groupId);
      showToast('Group deleted successfully', 'success');
      fetchGroups();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete group', 'error');
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const getAvailableStudents = () => {
    if (!selectedGroup) return allStudents;
    const groupStudentIds = selectedGroup.students.map(s => s._id);
    return allStudents.filter(s => !groupStudentIds.includes(s._id));
  };

  const filteredStudents = getAvailableStudents().filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading groups...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#2d3748' }}>👥 Student Groups</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          + Create Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: '#f7fafc',
          borderRadius: '12px',
          border: '2px dashed #cbd5e0'
        }}>
          <p style={{ fontSize: '48px', margin: '0 0 16px 0' }}>👥</p>
          <h3 style={{ margin: '0 0 8px 0', color: '#2d3748' }}>No Groups Yet</h3>
          <p style={{ color: '#718096', margin: '0 0 20px 0' }}>Create your first student group to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Create Group
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {groups.map(group => (
            <div
              key={group._id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#2d3748' }}>{group.name}</h3>
                  {group.description && (
                    <p style={{ margin: '0 0 8px 0', color: '#718096', fontSize: '14px' }}>{group.description}</p>
                  )}
                  <p style={{ margin: 0, color: '#a0aec0', fontSize: '13px' }}>
                    {group.students.length} student{group.students.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setSelectedGroup(group);
                      setShowAddStudentsModal(true);
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#eef2ff',
                      color: '#667eea',
                      border: '1.5px solid #667eea',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    + Add Students
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group._id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#fff5f5',
                      color: '#c53030',
                      border: '1.5px solid #fc8181',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {group.students.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#4a5568', fontWeight: '600' }}>Students:</h4>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {group.students.map(student => (
                      <div
                        key={student._id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px',
                          backgroundColor: '#f7fafc',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        <div>
                          <p style={{ margin: 0, fontWeight: '600', color: '#2d3748', fontSize: '14px' }}>{student.name}</p>
                          <p style={{ margin: 0, color: '#718096', fontSize: '12px' }}>{student.email}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveStudent(group._id, student._id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'white',
                            color: '#e53e3e',
                            border: '1px solid #fc8181',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2d3748' }}>Create New Group</h2>
            <form onSubmit={handleCreateGroup}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#4a5568' }}>
                  Group Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Math Class 2024"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#4a5568' }}>
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the group"
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ name: '', description: '' });
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#f7fafc',
                    color: '#4a5568',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Students Modal */}
      {showAddStudentsModal && selectedGroup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#2d3748' }}>
              Add Students to "{selectedGroup.name}"
            </h2>

            {allStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ fontSize: '48px', margin: '0 0 16px 0' }}>👨‍🎓</p>
                <p style={{ color: '#718096', fontSize: '14px', margin: 0 }}>
                  No students registered yet. Students need to register first.
                </p>
              </div>
            ) : getAvailableStudents().length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ fontSize: '48px', margin: '0 0 16px 0' }}>✓</p>
                <p style={{ color: '#718096', fontSize: '14px', margin: 0 }}>
                  All students are already in this group
                </p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="🔍 Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
                  {filteredStudents.length === 0 ? (
                    <p style={{ color: '#718096', padding: '20px', textAlign: 'center' }}>
                      No students found
                    </p>
                  ) : (
                    filteredStudents.map(student => (
                      <label
                        key={student._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px',
                          marginBottom: '8px',
                          backgroundColor: selectedStudents.includes(student._id) ? '#eef2ff' : '#f7fafc',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          border: `1.5px solid ${selectedStudents.includes(student._id) ? '#667eea' : '#e2e8f0'}`
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student._id)}
                          onChange={() => toggleStudentSelection(student._id)}
                          style={{ marginRight: '12px', width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontWeight: '600', color: '#2d3748', fontSize: '14px' }}>{student.name}</p>
                          <p style={{ margin: 0, color: '#718096', fontSize: '12px' }}>{student.email}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>

                {selectedStudents.length > 0 && (
                  <p style={{ marginBottom: '16px', color: '#667eea', fontSize: '14px', fontWeight: '600' }}>
                    {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAddStudentsModal(false);
                  setSelectedStudents([]);
                  setSearchTerm('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f7fafc',
                  color: '#4a5568',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {allStudents.length === 0 || getAvailableStudents().length === 0 ? 'Close' : 'Cancel'}
              </button>
              {allStudents.length > 0 && getAvailableStudents().length > 0 && (
                <button
                  onClick={handleAddStudents}
                  disabled={selectedStudents.length === 0}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: selectedStudents.length === 0 ? '#cbd5e0' : '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: selectedStudents.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Add Selected
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Groups;
