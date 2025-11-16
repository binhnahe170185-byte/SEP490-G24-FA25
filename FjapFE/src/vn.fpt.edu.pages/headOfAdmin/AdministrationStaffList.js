import React from 'react';
import UsersList from '../staffOfAdmin/User/UserList';

export default function AdministrationStaffList() {
  return <UsersList fixedRole={[6, 7]} title="Staff Management" />;
}

