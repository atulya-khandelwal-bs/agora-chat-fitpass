import { computed, unref } from 'vue';
import { useMemoizedList } from './useMemoizedList';

const STATUS_MAPS = {
    workout: {
        1: 'Reserved',
        2: 'Cancelled',
        3: 'Attended',
        4: 'Fraud'
    },
    sports: {
        1: 'Reserved',
        2: 'Cancelled',
        3: 'Attended',
        4: 'Fraud'
    },
    doctor_consultation: {
        1: 'Reserved',
        2: 'Cancelled',
        3: 'Attended'
    },
    lab_test: {
        1: 'New',
        2: 'Confirmed',
        3: 'Rejected',
        4: 'No Show',
        5: 'Cancelled',
        6: 'Rescheduled',
        7: 'Completed',
        8: 'Partner Rescheduled',
        9: 'Reports Pending',
        10: 'Partially Received',
        11: 'Received',
        12: 'Phlebo Assigned',
        13: 'Picked Up'
    },
    dietitian_call: {
        1: 'Pending',
        2: 'Cancelled',
        3: 'Completed',
        4: 'Call Disconnect',
        5: 'Rescheduled'
    }
};

const formatType = (type) => {
    if (!type) return 'N/A';
    return type
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const formatDate = (dateString) => {
    if (!dateString) {
        return 'N/A';
    }
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return 'N/A';
    }
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const padIndex = (index) => {
    const number = index + 1;
    return number < 10 ? `0${number}` : `${number}`;
};

const getStatusLabel = (type, status) => {
    if (type && STATUS_MAPS[type] && STATUS_MAPS[type][status]) {
        return STATUS_MAPS[type][status];
    }
    if (status === null || status === undefined) {
        return 'Unknown';
    }
    return `${status}`;
};

const statusBadgeClass = (statusText) => {
    const text = (statusText || '').toLowerCase();
    if (text.includes('complete') || text.includes('attended') || text.includes('received') || text.includes('picked')) {
        return 'bg-success-subtle text-success';
    }
    if (text.includes('cancel') || text.includes('reject') || text.includes('fraud')) {
        return 'bg-danger-subtle text-danger';
    }
    if (text.includes('resched') || text.includes('confirmed')) {
        return 'bg-info-subtle text-info';
    }
    if (text.includes('pending') || text.includes('new') || text.includes('reserved') || text.includes('phlebo')) {
        return 'bg-warning-subtle text-warning';
    }
    if (text.includes('no show') || text.includes('disconnect')) {
        return 'bg-secondary-subtle text-secondary';
    }
    return 'bg-secondary-subtle text-secondary';
};

const buildActivitySignature = (rows = []) => {
    if (!Array.isArray(rows) || rows.length === 0) {
        return 'recent:empty';
    }

    return rows
        .map((row) => `${row?.booking_name ?? 'unknown'}:${row?.create_time ?? ''}:${row?.status ?? ''}:${row?.type ?? ''}`)
        .join('|');
};

const sanitizeActivity = (activity, index) => {
    const statusText = getStatusLabel(activity?.type, activity?.status);
    return {
        ...activity,
        displayIndex: padIndex(index),
        displayType: formatType(activity?.type),
        formattedDate: formatDate(activity?.create_time),
        statusText,
        statusClass: statusBadgeClass(statusText),
        userName: activity?.user_name || 'N/A'
    };
};

export function useRecentActivities(source, options = {}) {
    const { maxRecords = 10 } = options;

    const resolveSource = () => {
        const data = typeof source === 'function' ? source() : unref(source);
        return Array.isArray(data) ? data : [];
    };

    const { memoizedList: memoizedActivities } = useMemoizedList({
        source: () => resolveSource().filter((activity) => activity && activity.booking_name && activity.create_time),
        buildSignature: buildActivitySignature,
        mapItem: sanitizeActivity
    });

    const activities = computed(() => memoizedActivities.value.slice(0, maxRecords));
    const hasActivities = computed(() => activities.value.length > 0);

    return {
        activities,
        hasActivities
    };
}

